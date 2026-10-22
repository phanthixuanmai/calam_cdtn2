package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.ReviewRequest;
import com.freelance.marketplace.entity.Review;
import com.freelance.marketplace.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/reviews")
    @PreAuthorize("hasAnyRole('STUDENT','EMPLOYER')")
    public ResponseEntity<ApiResponse<Review>> createReview(@Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Review created successfully", reviewService.createReview(request)));
    }

    @GetMapping("/reviews/user/{userId}")
    public ResponseEntity<ApiResponse<List<Review>>> getReviewsForUser(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success("Reviews retrieved successfully", reviewService.getReviewsForUser(userId)));
    }
}
