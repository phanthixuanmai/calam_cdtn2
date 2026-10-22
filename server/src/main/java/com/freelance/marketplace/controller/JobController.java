package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.JobRequest;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.service.JobService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<List<Job>>> getJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(ApiResponse.success("Jobs retrieved successfully", jobService.getAllJobs(keyword, category, location, status)));
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<Job>> getJobById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Job retrieved successfully", jobService.getJobById(id)));
    }

    @PostMapping("/jobs")
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<Job>> createJob(@Valid @RequestBody JobRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Job created successfully", jobService.createJob(request)));
    }

    @PutMapping("/jobs/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<Job>> updateJob(@PathVariable String id, @Valid @RequestBody JobRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Job updated successfully", jobService.updateJob(id, request)));
    }

    @DeleteMapping("/jobs/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable String id) {
        jobService.deleteJob(id);
        return ResponseEntity.ok(ApiResponse.success("Job deleted successfully", null));
    }
}
