package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.JobRequest;
import com.freelance.marketplace.dto.EmployerDashboardStats;
import com.freelance.marketplace.entity.ApplicationStatus;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.entity.WorkStage;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.JobRepository;
import com.freelance.marketplace.repository.ApplicationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final UserService userService;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;

    public JobService(
            JobRepository jobRepository,
            UserService userService,
            ApplicationRepository applicationRepository,
            NotificationService notificationService
    ) {
        this.jobRepository = jobRepository;
        this.userService = userService;
        this.applicationRepository = applicationRepository;
        this.notificationService = notificationService;
    }

    public List<Job> getAllJobs(String keyword, String category, String location, String status) {
        JobStatus jobStatus;
        try {
            jobStatus = status == null || status.isBlank() ? JobStatus.OPEN : JobStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Trạng thái công việc không hợp lệ");
        }
        return filterJobs(jobRepository.findAll(), keyword, category, location, jobStatus);
    }

    public List<Job> getMyJobs(String keyword, String category, String location, String status) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.EMPLOYER && currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Chỉ nhà tuyển dụng mới có thể xem tin của mình");
        }
        JobStatus jobStatus = null;
        try {
            if (status != null && !status.isBlank()) {
                jobStatus = JobStatus.valueOf(status.toUpperCase());
            }
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Trạng thái công việc không hợp lệ");
        }
        return filterJobs(jobRepository.findByEmployer_Id(currentUser.getId()), keyword, category, location, jobStatus);
    }

    public EmployerDashboardStats getEmployerDashboardStats() {
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.EMPLOYER && currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Chỉ nhà tuyển dụng mới có thể xem tổng quan");
        }

        List<Job> ownedJobs = jobRepository.findByEmployer_Id(currentUser.getId());
        long totalApplications = 0;
        long pendingApplications = 0;
        long acceptedApplications = 0;
        for (Job job : ownedJobs) {
            List<com.freelance.marketplace.entity.Application> applications = applicationRepository.findByJob_Id(job.getId());
            totalApplications += applications.size();
            pendingApplications += applications.stream()
                    .filter(application -> application.getStatus() == ApplicationStatus.PENDING)
                    .count();
            acceptedApplications += applications.stream()
                    .filter(application -> application.getStatus() == ApplicationStatus.ACCEPTED)
                    .count();
        }

        return new EmployerDashboardStats(
                ownedJobs.size(),
                ownedJobs.stream().filter(job -> job.getStatus() == JobStatus.OPEN).count(),
                ownedJobs.stream().filter(job -> job.getStatus() == JobStatus.CLOSED).count(),
                totalApplications,
                pendingApplications,
                acceptedApplications,
                ownedJobs.stream().filter(job -> job.getWorkStage() == WorkStage.IN_PROGRESS).count(),
                ownedJobs.stream().filter(job -> job.getWorkStage() == WorkStage.COMPLETED
                        || job.getStatus() == JobStatus.COMPLETED).count()
        );
    }

    private List<Job> filterJobs(List<Job> jobs, String keyword, String category, String location, JobStatus status) {
        return jobs.stream()
                .filter(job -> keyword == null || keyword.isBlank()
                        || job.getTitle().toLowerCase().contains(keyword.toLowerCase())
                        || (job.getDescription() != null && job.getDescription().toLowerCase().contains(keyword.toLowerCase())))
                .filter(job -> category == null || category.isBlank() || category.equalsIgnoreCase(job.getCategory()))
                .filter(job -> location == null || location.isBlank()
                        || (job.getLocation() != null && job.getLocation().toLowerCase().contains(location.toLowerCase())))
                .filter(job -> status == null || job.getStatus() == status)
                .toList();
    }

    public Job getJobById(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
    }

    public Job createJob(JobRequest request) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.EMPLOYER && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("Only employers can post jobs");
        }
        validateDateRange(request.startDate(), request.endDate());

        Job job = new Job();
        job.setTitle(request.title());
        job.setDescription(request.description());
        job.setCategory(request.category());
        job.setLocation(request.location());
        job.setSalaryRange(request.salaryRange());
        job.setStatus(JobStatus.OPEN);
        job.setWorkStage(WorkStage.RECRUITING);
        job.setEmployer(currentUser);
        job.setWorkSchedule(request.workSchedule());
        job.setStartDate(request.startDate());
        job.setEndDate(request.endDate());

        return jobRepository.save(job);
    }

    public Job updateJob(String id, JobRequest request) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!ownsJobOrIsAdmin(job, currentUser)) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa tin tuyển dụng này");
        }
        if (job.getStatus() == JobStatus.CLOSED || job.getStatus() == JobStatus.COMPLETED) {
            throw new BadRequestException("Không thể chỉnh sửa tin đã đóng hoặc đã hoàn thành");
        }

        if (request.title() != null) job.setTitle(request.title());
        if (request.description() != null) job.setDescription(request.description());
        if (request.category() != null) job.setCategory(request.category());
        if (request.location() != null) job.setLocation(request.location());
        if (request.salaryRange() != null) job.setSalaryRange(request.salaryRange());
        if (request.workSchedule() != null) job.setWorkSchedule(request.workSchedule());
        job.setStartDate(request.startDate());
        job.setEndDate(request.endDate());
        validateDateRange(job.getStartDate(), job.getEndDate());

        return jobRepository.save(job);
    }

    public void deleteJob(String id) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!ownsJobOrIsAdmin(job, currentUser)) {
            throw new AccessDeniedException("Bạn không có quyền xóa tin tuyển dụng này");
        }
        if (job.getStatus() == JobStatus.CLOSED || job.getStatus() == JobStatus.COMPLETED
                || !applicationRepository.findByJob_Id(job.getId()).isEmpty()) {
            throw new BadRequestException("Không thể xóa tin đã đóng, đã hoàn thành hoặc có hồ sơ ứng tuyển");
        }
        jobRepository.delete(job);
    }

    public Job closeJob(String id) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!ownsJobOrIsAdmin(job, currentUser)) {
            throw new AccessDeniedException("Bạn không có quyền đóng tin tuyển dụng này");
        }
        if (job.getStatus() != JobStatus.OPEN && job.getStatus() != JobStatus.FILLED) {
            throw new BadRequestException("Tin tuyển dụng này không còn ở trạng thái có thể đóng");
        }
        job.setStatus(JobStatus.CLOSED);
        Job saved = jobRepository.save(job);
        applicationRepository.findByJob_Id(job.getId()).stream()
                .filter(application -> application.getStatus() == ApplicationStatus.PENDING
                        || application.getStatus() == ApplicationStatus.ACCEPTED)
                .filter(application -> application.getStudent() != null)
                .forEach(application -> notificationService.createNotification(
                        application.getStudent(),
                        "Tin tuyển dụng đã đóng",
                        "Tin " + job.getTitle() + " đã ngừng nhận hồ sơ mới. Hồ sơ hiện có vẫn được lưu."
                ));
        return saved;
    }

    public Job advanceWorkStage(String id, WorkStage requestedStage) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!ownsJobOrIsAdmin(job, currentUser)) {
            throw new AccessDeniedException("Bạn không có quyền cập nhật tiến độ công việc này");
        }

        WorkStage nextStage = switch (job.getWorkStage()) {
            case HIRED -> WorkStage.IN_PROGRESS;
            case IN_PROGRESS -> WorkStage.COMPLETED;
            default -> throw new BadRequestException("Công việc chưa sẵn sàng chuyển sang giai đoạn tiếp theo");
        };
        if (requestedStage != nextStage) {
            throw new BadRequestException("Chỉ được chuyển sang giai đoạn kế tiếp");
        }
        List<com.freelance.marketplace.entity.Application> acceptedApplications = applicationRepository.findByJob_Id(job.getId()).stream()
                .filter(application -> application.getStatus() == ApplicationStatus.ACCEPTED)
                .toList();
        if (acceptedApplications.isEmpty()) {
            throw new BadRequestException("Cần có sinh viên được nhận trước khi cập nhật tiến độ");
        }

        job.setWorkStage(nextStage);
        if (nextStage == WorkStage.COMPLETED) {
            job.setStatus(JobStatus.COMPLETED);
        }
        Job saved = jobRepository.save(job);
        String title = nextStage == WorkStage.COMPLETED ? "Công việc đã hoàn thành" : "Công việc đang được thực hiện";
        String content = "Công việc " + job.getTitle() + " đã chuyển sang giai đoạn " + nextStage + ".";
        acceptedApplications.stream()
                .map(com.freelance.marketplace.entity.Application::getStudent)
                .filter(student -> student != null)
                .forEach(student -> notificationService.createNotification(student, title, content));
        return saved;
    }

    private boolean ownsJobOrIsAdmin(Job job, User currentUser) {
        return currentUser.getRole() == Role.ADMIN
                || (currentUser.getId() != null
                && job.getEmployer() != null
                && currentUser.getId().equals(job.getEmployer().getId()));
    }

    private void validateDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null && !endDate.isAfter(startDate)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }
}
