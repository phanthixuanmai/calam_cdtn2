package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(
        @NotNull(message = "Status is required") ApplicationStatus status
) {
}
