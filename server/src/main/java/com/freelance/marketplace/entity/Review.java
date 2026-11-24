package com.freelance.marketplace.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import java.time.LocalDateTime;

@Document(collection = "reviews")
@CompoundIndex(
        name = "unique_review_per_application_and_reviewer",
        def = "{ 'applicationId': 1, 'reviewerId': 1 }",
        unique = true,
        sparse = true
)
public class Review {

    @Id
    private String id;

    private User reviewer;

    private User reviewee;

    private Role targetType;

    private String jobId;

    private String applicationId;

    private String reviewerId;

    private int rating;

    private String comment;

    @CreatedDate
    private LocalDateTime createdAt;

    public Review() {
    }

    public Review(String id, User reviewer, User reviewee, Role targetType, int rating, String comment, LocalDateTime createdAt) {
        this.id = id;
        this.reviewer = reviewer;
        this.reviewee = reviewee;
        this.targetType = targetType;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }
    public User getReviewee() { return reviewee; }
    public void setReviewee(User reviewee) { this.reviewee = reviewee; }
    public Role getTargetType() { return targetType; }
    public void setTargetType(Role targetType) { this.targetType = targetType; }
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }
    public String getReviewerId() { return reviewerId; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
