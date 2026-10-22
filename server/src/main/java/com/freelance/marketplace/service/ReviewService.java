package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.ReviewRequest;
import com.freelance.marketplace.entity.Review;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.ReviewRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public ReviewService(
            ReviewRepository reviewRepository,
            UserRepository userRepository,
            UserService userService,
            NotificationService notificationService
    ) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    public Review createReview(ReviewRequest request) {
        User reviewer = userService.getCurrentUser();
        User reviewee = userRepository.findById(request.revieweeId())
                .orElseThrow(() -> new ResourceNotFoundException("User to review not found"));

        if (reviewee.getId().equals(reviewer.getId())) {
            throw new BadRequestException("You cannot review yourself");
        }

        Review review = new Review();
        review.setReviewer(reviewer);
        review.setReviewee(reviewee);
        review.setTargetType(request.targetType());
        review.setRating(request.rating());
        review.setComment(request.comment());

        Review saved = reviewRepository.save(review);
        notificationService.createNotification(
                reviewee,
                "Bạn nhận được đánh giá mới",
                reviewer.getName() + " đã đánh giá bạn với " + request.rating() + " sao."
        );
        return saved;
    }

    public List<Review> getReviewsForUser(String userId) {
        User reviewee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return reviewRepository.findByReviewee(reviewee);
    }
}
