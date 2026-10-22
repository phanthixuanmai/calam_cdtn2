package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Email is required") @Email(message = "Email is invalid") String email,
        @NotBlank(message = "Password is required") String password,
        String phone,
        String username,
        Role role
) {
}
