package com.freelance.marketplace.dto;

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
        String cvUrl
) {
}
