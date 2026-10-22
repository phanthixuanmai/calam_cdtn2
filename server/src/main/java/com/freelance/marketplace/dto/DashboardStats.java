package com.freelance.marketplace.dto;

public record DashboardStats(
        long totalStudents,
        long totalEmployers,
        long totalJobs,
        long totalApplications,
        long totalCompletedJobs
) {
}
