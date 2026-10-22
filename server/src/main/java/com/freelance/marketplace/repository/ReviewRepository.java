package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Review;
import com.freelance.marketplace.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByReviewee(User user);
}
