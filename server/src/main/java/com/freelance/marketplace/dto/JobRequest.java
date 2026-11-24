package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record JobRequest(
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Description is required") String description,
        String category,
        String location,
        String salaryRange,
        String workSchedule,
        JobStatus status,
        LocalDateTime startDate,
        LocalDateTime endDate
) {
    public JobRequest(
            String title,
            String description,
            String category,
            String location,
            String salaryRange,
            JobStatus status,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        this(title, description, category, location, salaryRange, null, status, startDate, endDate);
    }
}
