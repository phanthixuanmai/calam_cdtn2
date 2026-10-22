package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record JobRequest(
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Description is required") String description,
        String category,
        String location,
        String salaryRange,
        JobStatus status,
        LocalDateTime startDate,
        LocalDateTime endDate
) {
}
