package com.freelance.marketplace.dto;

public record EmployerDashboardStats(
        long totalJobs,
        long openJobs,
        long closedJobs,
        long totalApplications,
        long pendingApplications,
        long acceptedApplications,
        long inProgressJobs,
        long completedJobs
) {
}
