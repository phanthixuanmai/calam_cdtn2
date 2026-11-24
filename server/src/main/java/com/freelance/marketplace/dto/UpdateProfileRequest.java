package com.freelance.marketplace.dto;

import jakarta.validation.Valid;

import java.util.List;

public record UpdateProfileRequest(
        String name,
        String phone,
        String bio,
        String address,
        String companyName,
        String description,
        String website,
        String location,
        String skills,
        String cvUrl,
        @Valid List<AvailabilitySlotRequest> availability
) {
}
