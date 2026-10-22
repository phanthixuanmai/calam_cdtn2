package com.freelance.marketplace.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "applications")
public class Application {

    @Id
    private String id;

    private Job job;

    private User student;

    private String cvUrl;

    private String coverLetter;

    private ApplicationStatus status = ApplicationStatus.PENDING;

    @CreatedDate
    private LocalDateTime appliedAt;

    public Application() {
    }

    public Application(String id, Job job, User student, String cvUrl, String coverLetter, ApplicationStatus status, LocalDateTime appliedAt) {
        this.id = id;
        this.job = job;
        this.student = student;
        this.cvUrl = cvUrl;
        this.coverLetter = coverLetter;
        this.status = status;
        this.appliedAt = appliedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
    public String getCoverLetter() { return coverLetter; }
    public void setCoverLetter(String coverLetter) { this.coverLetter = coverLetter; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }
}
