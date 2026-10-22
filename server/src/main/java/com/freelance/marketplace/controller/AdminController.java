package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.DashboardStats;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardStats>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success("Dashboard stats loaded", adminService.getDashboardStats()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", adminService.getAllUsers()));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("User status updated successfully", adminService.toggleUserStatus(id)));
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<List<Job>>> getJobs() {
        return ResponseEntity.ok(ApiResponse.success("Jobs retrieved successfully", adminService.getAllJobsForAdmin()));
    }
}
