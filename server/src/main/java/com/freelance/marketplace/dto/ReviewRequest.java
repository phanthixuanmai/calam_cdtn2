package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotBlank(message = "Reviewee id is required") String revieweeId,
        @NotNull(message = "Target type is required") Role targetType,
        @Min(value = 1, message = "Rating minimum is 1")
        @Max(value = 5, message = "Rating maximum is 5") int rating,
        @Size(max = 2000, message = "Nhận xét không được vượt quá 2.000 ký tự")
        String comment,
        @NotBlank(message = "Application id is required") String applicationId
) {
    public ReviewRequest(String revieweeId, Role targetType, int rating, String comment) {
        this(revieweeId, targetType, rating, comment, null);
    }
}
