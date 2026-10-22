package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.UpdateProfileRequest;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('STUDENT','EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyProfile() {
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", userService.getMyProfile()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('STUDENT','EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<User>> updateProfile(@RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", userService.updateProfile(request)));
    }
}
