package com.freelance.marketplace.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplicationRequest(
        @NotBlank(message = "Job id is required") String jobId,
        String cvUrl,
        @NotBlank(message = "Cover letter is required") String coverLetter
) {
}
