package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.DashboardStats;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminServiceTest {

    @Test
    void getDashboardStats_shouldReportPersistedApplicationCount() {
        UserRepository userRepository = mock(UserRepository.class);
        JobRepository jobRepository = mock(JobRepository.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);

        User student = new User();
        student.setRole(Role.STUDENT);
        User employer = new User();
        employer.setRole(Role.EMPLOYER);
        Job completedJob = new Job();
        completedJob.setStatus(JobStatus.COMPLETED);
        Job openJob = new Job();
        openJob.setStatus(JobStatus.OPEN);

        when(userRepository.findAll()).thenReturn(List.of(student, employer));
        when(jobRepository.count()).thenReturn(2L);
        when(jobRepository.findAll()).thenReturn(List.of(completedJob, openJob));
        when(applicationRepository.count()).thenReturn(3L);

        DashboardStats stats = new AdminService(userRepository, jobRepository, applicationRepository).getDashboardStats();

        assertEquals(1L, stats.totalStudents());
        assertEquals(1L, stats.totalEmployers());
        assertEquals(2L, stats.totalJobs());
        assertEquals(3L, stats.totalApplications());
        assertEquals(1L, stats.totalCompletedJobs());
    }
}