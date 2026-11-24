package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.ReviewRequest;
import com.freelance.marketplace.entity.Application;
import com.freelance.marketplace.entity.ApplicationStatus;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.Review;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.entity.WorkStage;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import com.freelance.marketplace.repository.ReviewRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            UserRepository userRepository,
            UserService userService,
            NotificationService notificationService,
            ApplicationRepository applicationRepository,
            JobRepository jobRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.notificationService = notificationService;
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
    }

    public Review createReview(ReviewRequest request) {
        User reviewer = userService.getCurrentUser();
        Application application = applicationRepository.findById(request.applicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        Job job = jobRepository.findById(resolveJobId(application))
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        application.setJob(job);
        String studentId = resolveStudentId(application);
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        application.setStudent(student);
        if (application.getStatus() != ApplicationStatus.ACCEPTED || job.getWorkStage() != WorkStage.COMPLETED) {
            throw new BadRequestException("Chỉ có thể đánh giá sau khi công việc đã hoàn thành và bạn đã được nhận");
        }

        User reviewee;
        if (reviewer.getRole() == Role.STUDENT
                && reviewer.getId() != null
                && reviewer.getId().equals(student.getId())) {
            reviewee = job.getEmployer();
        } else if (reviewer.getRole() == Role.EMPLOYER
                && job.getEmployer() != null
                && reviewer.getId() != null
                && reviewer.getId().equals(job.getEmployer().getId())) {
            reviewee = student;
        } else {
            throw new AccessDeniedException("Bạn không tham gia công việc này");
        }
        if (reviewee == null) {
            throw new ResourceNotFoundException("Người được đánh giá không tồn tại");
        }

        if (request.revieweeId() != null && !request.revieweeId().equals(reviewee.getId())) {
            throw new BadRequestException("Người được đánh giá không khớp với công việc");
        }
        if (request.targetType() != reviewee.getRole()) {
            throw new BadRequestException("Loại người được đánh giá không hợp lệ");
        }
        if (reviewRepository.existsByApplicationIdAndReviewerId(application.getId(), reviewer.getId())) {
            throw new BadRequestException("Bạn đã gửi đánh giá cho công việc này");
        }

        Review review = new Review();
        review.setReviewer(reviewer);
        review.setReviewee(reviewee);
        review.setTargetType(request.targetType());
        review.setJobId(job.getId());
        review.setApplicationId(application.getId());
        review.setReviewerId(reviewer.getId());
        review.setRating(request.rating());
        review.setComment(request.comment());

        Review saved;
        try {
            saved = reviewRepository.save(review);
        } catch (DuplicateKeyException ex) {
            throw new BadRequestException("Bạn đã gửi đánh giá cho công việc này");
        }
        notificationService.createNotification(
                reviewee,
                "Bạn nhận được đánh giá mới",
                reviewer.getName() + " đã đánh giá bạn với " + request.rating() + " sao."
        );
        return saved;
    }

    public List<Review> getReviewsForWork(String applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        Job job = jobRepository.findById(resolveJobId(application))
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        application.setJob(job);
        User currentUser = userService.getCurrentUser();
        String studentId = resolveStudentId(application);
        boolean isStudent = currentUser.getId() != null && studentId.equals(currentUser.getId());
        boolean isEmployer = job.getEmployer() != null
                && currentUser.getId() != null
                && currentUser.getId().equals(job.getEmployer().getId());
        if ((!isStudent && !isEmployer) || application.getStatus() != ApplicationStatus.ACCEPTED) {
            throw new AccessDeniedException("Bạn không có quyền xem đánh giá của công việc này");
        }
        return reviewRepository.findByApplicationId(applicationId);
    }

    private String resolveJobId(Application application) {
        if (application.getJob() != null && application.getJob().getId() != null) {
            return application.getJob().getId();
        }
        if (application.getJobId() != null) {
            return application.getJobId();
        }
        throw new ResourceNotFoundException("Job not found");
    }

    private String resolveStudentId(Application application) {
        if (application.getStudent() != null && application.getStudent().getId() != null) {
            return application.getStudent().getId();
        }
        if (application.getStudentId() != null) {
            return application.getStudentId();
        }
        throw new ResourceNotFoundException("Student not found");
    }

    public List<Review> getReviewsForUser(String userId) {
        User reviewee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return reviewRepository.findByReviewee_Id(reviewee.getId());
    }
}
