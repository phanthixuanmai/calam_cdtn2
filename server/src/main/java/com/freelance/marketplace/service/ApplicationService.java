package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.ApplicationRequest;
import com.freelance.marketplace.dto.StatusUpdateRequest;
import com.freelance.marketplace.entity.Application;
import com.freelance.marketplace.entity.ApplicationStatus;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            JobRepository jobRepository,
            UserService userService,
            NotificationService notificationService
    ) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    public Application applyForJob(ApplicationRequest request) {
        User student = userService.getCurrentUser();
        if (student.getRole() != Role.STUDENT) {
            throw new BadRequestException("Only students can apply for jobs");
        }

        Job job = jobRepository.findById(request.jobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (applicationRepository.findByStudentAndJob(student, job).isPresent()) {
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
        return applicationRepository.findByStudent(student);
    }

    public List<Application> getJobApplications(String jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        return applicationRepository.findByJob(job);
    }

    public Application updateApplicationStatus(String id, StatusUpdateRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        User currentUser = userService.getCurrentUser();

        if (!application.getJob().getEmployer().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("Only the employer can update application status");
        }

        application.setStatus(request.status());
        if (request.status() == ApplicationStatus.ACCEPTED) {
            application.getJob().setStatus(JobStatus.FILLED);
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
        return applicationRepository.save(application);
    }
}
