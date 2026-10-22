package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReviewRequest(
        @NotBlank(message = "Reviewee id is required") String revieweeId,
        @NotNull(message = "Target type is required") Role targetType,
        @Min(value = 1, message = "Rating minimum is 1")
        @Max(value = 5, message = "Rating maximum is 5") int rating,
        String comment
) {
}
