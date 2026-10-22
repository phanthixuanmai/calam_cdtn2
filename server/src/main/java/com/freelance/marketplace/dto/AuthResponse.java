package com.freelance.marketplace.dto;

public record AuthResponse(
        String token,
        String role,
        String email,
        String name
) {
}
