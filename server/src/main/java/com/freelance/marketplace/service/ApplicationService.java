package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.ApplicationRequest;
import com.freelance.marketplace.dto.StatusUpdateRequest;
import com.freelance.marketplace.entity.Application;
import com.freelance.marketplace.entity.ApplicationStatus;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.entity.WorkStage;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            JobRepository jobRepository,
            UserService userService,
            NotificationService notificationService,
            UserRepository userRepository,
            EmailService emailService
    ) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userService = userService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public Application applyForJob(ApplicationRequest request) {
        User student = userService.getCurrentUser();
        if (student.getRole() != Role.STUDENT) {
            throw new BadRequestException("Only students can apply for jobs");
        }

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (job.getStatus() != JobStatus.OPEN) {
            throw new BadRequestException("Công việc không còn nhận hồ sơ ứng tuyển");
        }
        if (applicationRepository.findByStudent_IdAndJob_Id(student.getId(), job.getId()).isPresent()) {
            throw new BadRequestException("You have already applied for this job");
        }

        Application application = new Application();
        application.setJob(job);
        application.setStudent(student);
        application.setCvUrl(request.cvUrl());
        application.setCoverLetter(request.coverLetter());
        application.setStatus(ApplicationStatus.PENDING);

        Application saved = applicationRepository.save(application);
        notificationService.createNotification(
                job.getEmployer(),
                "Sinh viên ứng tuyển",
                "Sinh viên " + student.getName() + " đã ứng tuyển vào công việc " + job.getTitle() + "."
        );
        return saved;
    }

    public List<Application> getMyApplications() {
        User student = userService.getCurrentUser();
        List<Application> applications = applicationRepository.findByStudent_Id(student.getId());
        refreshJobs(applications);
        return applications;
    }

    public List<Application> getJobApplications(String jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.ADMIN
                && (currentUser.getId() == null || job.getEmployer() == null
                || !currentUser.getId().equals(job.getEmployer().getId()))) {
            throw new AccessDeniedException("Bạn không có quyền xem hồ sơ ứng tuyển của tin này");
        }
        List<Application> applications = applicationRepository.findByJob_Id(jobId);
        refreshJobs(applications);
        return applications;
    }

    public Application updateApplicationStatus(String id, StatusUpdateRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        hydrateRelationships(application);
        if (application.getJob() == null || application.getJob().getId() == null) {
            throw new ResourceNotFoundException("Job not found");
        }
        Job currentJob = jobRepository.findById(application.getJob().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        application.setJob(currentJob);
        User currentUser = userService.getCurrentUser();

        if (currentUser.getRole() != Role.ADMIN
                && (currentUser.getId() == null || application.getJob().getEmployer() == null
                || !currentUser.getId().equals(application.getJob().getEmployer().getId()))) {
            throw new AccessDeniedException("Chỉ nhà tuyển dụng sở hữu tin mới có thể cập nhật hồ sơ");
        }
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể cập nhật hồ sơ đang chờ xử lý");
        }
        if (request.status() == ApplicationStatus.CANCELLED) {
            throw new BadRequestException("Nhà tuyển dụng không thể hủy đơn thay cho sinh viên");
        }
        if (request.status() != ApplicationStatus.ACCEPTED && request.status() != ApplicationStatus.REJECTED) {
            throw new BadRequestException("Trạng thái hồ sơ không hợp lệ");
        }
        if (request.status() == ApplicationStatus.ACCEPTED
                && application.getJob().getStatus() == JobStatus.COMPLETED) {
            throw new BadRequestException("Không thể nhận ứng viên cho công việc đã hoàn thành");
        }
        if (request.status() == ApplicationStatus.ACCEPTED
                && application.getJob().getWorkStage() != WorkStage.RECRUITING
                && application.getJob().getWorkStage() != WorkStage.HIRED) {
            throw new BadRequestException("Không thể nhận thêm ứng viên ở giai đoạn công việc hiện tại");
        }

        application.setStatus(request.status());
        if (request.status() == ApplicationStatus.ACCEPTED) {
            if (application.getJob().getWorkStage() == WorkStage.RECRUITING) {
                application.getJob().setWorkStage(WorkStage.HIRED);
            }
            if (application.getJob().getStatus() == JobStatus.OPEN) {
                application.getJob().setStatus(JobStatus.FILLED);
            }
            notificationService.createNotification(
                    application.getStudent(),
                    "Đơn ứng tuyển đã được chấp nhận",
                    "Đơn ứng tuyển cho công việc " + application.getJob().getTitle() + " đã được chấp nhận."
            );
        }
        if (request.status() == ApplicationStatus.REJECTED) {
            notificationService.createNotification(
                    application.getStudent(),
                    "Đơn ứng tuyển bị từ chối",
                    "Đơn ứng tuyển cho công việc " + application.getJob().getTitle() + " đã bị từ chối."
            );
        }

        jobRepository.save(application.getJob());
        Application saved = applicationRepository.save(application);
        if (request.status() == ApplicationStatus.ACCEPTED) {
            emailService.sendApplicationAccepted(application.getStudent(), application.getJob());
        }
        return saved;
    }

    public Application cancelApplication(String id) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        hydrateRelationships(application);
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.STUDENT
                || application.getStudent() == null
                || !application.getStudent().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Bạn chỉ có thể hủy đơn ứng tuyển của chính mình");
        }
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn đang chờ nhà tuyển dụng xử lý");
        }
        application.setStatus(ApplicationStatus.CANCELLED);
        Application saved = applicationRepository.save(application);
        if (application.getJob() != null && application.getJob().getEmployer() != null) {
            notificationService.createNotification(
                    application.getJob().getEmployer(),
                    "Đơn ứng tuyển đã được hủy",
                    "Sinh viên " + currentUser.getName() + " đã hủy đơn ứng tuyển cho công việc "
                            + application.getJob().getTitle() + "."
            );
        }
        return saved;
    }

    private void refreshJobs(List<Application> applications) {
        applications.forEach(this::hydrateRelationships);
    }

    private void hydrateRelationships(Application application) {
        String jobId = application.getJob() != null && application.getJob().getId() != null
                ? application.getJob().getId() : application.getJobId();
        if (jobId != null) {
            jobRepository.findById(jobId).ifPresent(application::setJob);
        }
        String studentId = application.getStudent() != null && application.getStudent().getId() != null
                ? application.getStudent().getId() : application.getStudentId();
        if (studentId != null) {
            userRepository.findById(studentId).ifPresent(application::setStudent);
        }
    }
}