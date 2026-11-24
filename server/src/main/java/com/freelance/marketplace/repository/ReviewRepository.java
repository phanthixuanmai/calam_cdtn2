package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Review;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByReviewee_Id(String userId);
    List<Review> findByApplicationId(String applicationId);
    boolean existsByApplicationIdAndReviewerId(String applicationId, String reviewerId);
}
