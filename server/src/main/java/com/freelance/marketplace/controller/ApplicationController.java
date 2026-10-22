package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.ApplicationRequest;
import com.freelance.marketplace.dto.StatusUpdateRequest;
import com.freelance.marketplace.entity.Application;
import com.freelance.marketplace.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping("/applications")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Application>> applyForJob(@Valid @RequestBody ApplicationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Application submitted successfully", applicationService.applyForJob(request)));
    }

    @GetMapping("/applications/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<Application>>> getMyApplications() {
        return ResponseEntity.ok(ApiResponse.success("Applications retrieved successfully", applicationService.getMyApplications()));
    }

    @GetMapping("/jobs/{jobId}/applications")
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Application>>> getJobApplications(@PathVariable String jobId) {
        return ResponseEntity.ok(ApiResponse.success("Applications retrieved successfully", applicationService.getJobApplications(jobId)));
    }

    @PutMapping("/applications/{id}/status")
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<Application>> updateStatus(@PathVariable String id, @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Application status updated successfully", applicationService.updateApplicationStatus(id, request)));
    }
}
