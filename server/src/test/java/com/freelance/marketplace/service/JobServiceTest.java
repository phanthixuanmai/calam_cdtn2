package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.JobRequest;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JobServiceTest {

    @Test
    void updateJob_shouldSaveChangesForOwningEmployer() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        User employer = employer("employer-1");
        Job job = job("job-1", JobStatus.OPEN, employer);
        JobRequest request = new JobRequest(
                "Updated title",
                "Updated description",
                "Retail",
                "Hanoi",
                "Negotiable",
                "Evenings",
                null,
                null,
                null
        );

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer);
        when(jobRepository.save(job)).thenReturn(job);

        Job updatedJob = new JobService(jobRepository, userService, applicationRepository, notificationService)
                .updateJob(job.getId(), request);

        assertSame(job, updatedJob);
        assertEquals("Updated title", updatedJob.getTitle());
        assertEquals("Updated description", updatedJob.getDescription());
        assertEquals("Retail", updatedJob.getCategory());
        assertEquals("Hanoi", updatedJob.getLocation());
        assertEquals("Negotiable", updatedJob.getSalaryRange());
        assertEquals("Evenings", updatedJob.getWorkSchedule());
        verify(jobRepository).save(job);
    }

    @Test
    void updateJob_shouldClearDatesWhenTheEmployerRemovesThem() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        User employer = employer("employer-1");
        Job job = job("job-1", JobStatus.OPEN, employer);
        job.setStartDate(LocalDateTime.parse("2026-03-01T09:00:00"));
        job.setEndDate(LocalDateTime.parse("2026-03-31T18:00:00"));
        JobRequest request = new JobRequest(
                "Updated title",
                "Updated description",
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer);
        when(jobRepository.save(job)).thenReturn(job);

        Job updatedJob = new JobService(jobRepository, userService, applicationRepository, notificationService)
                .updateJob(job.getId(), request);

        assertNull(updatedJob.getStartDate());
        assertNull(updatedJob.getEndDate());
        verify(jobRepository).save(job);
    }

    @Test
    void updateJob_shouldRejectAnotherEmployersJob() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        Job job = job("job-1", JobStatus.OPEN, employer("owner"));
        JobRequest request = new JobRequest("Updated title", "Updated description", null, null, null, null, null, null, null);

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer("other"));

        JobService jobService = new JobService(jobRepository, userService, applicationRepository, notificationService);

        assertThrows(AccessDeniedException.class, () -> jobService.updateJob(job.getId(), request));
        verify(jobRepository, never()).save(job);
    }

    @Test
    void closeJob_shouldSaveClosedStatusForOwningEmployer() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        User employer = employer("employer-1");
        Job job = job("job-1", JobStatus.OPEN, employer);

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer);
        when(jobRepository.save(job)).thenReturn(job);

        Job closedJob = new JobService(jobRepository, userService, applicationRepository, notificationService).closeJob(job.getId());

        assertSame(job, closedJob);
        assertEquals(JobStatus.CLOSED, closedJob.getStatus());
        verify(jobRepository).save(job);
    }

    @Test
    void closeJob_shouldAlsoCloseFilledJobs() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        User employer = employer("employer-1");
        Job job = job("job-1", JobStatus.FILLED, employer);

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer);
        when(jobRepository.save(job)).thenReturn(job);

        Job closedJob = new JobService(jobRepository, userService, applicationRepository, notificationService).closeJob(job.getId());

        assertEquals(JobStatus.CLOSED, closedJob.getStatus());
        verify(jobRepository).save(job);
    }

    @Test
    void closeJob_shouldRejectAnotherEmployersJob() {
        JobRepository jobRepository = mock(JobRepository.class);
        UserService userService = mock(UserService.class);
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        NotificationService notificationService = mock(NotificationService.class);
        Job job = job("job-1", JobStatus.OPEN, employer("owner"));

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userService.getCurrentUser()).thenReturn(employer("other"));

        JobService jobService = new JobService(jobRepository, userService, applicationRepository, notificationService);

        assertThrows(AccessDeniedException.class, () -> jobService.closeJob(job.getId()));
        verify(jobRepository, never()).save(job);
    }

    private User employer(String id) {
        User employer = new User();
        employer.setId(id);
        employer.setRole(Role.EMPLOYER);
        return employer;
    }

    private Job job(String id, JobStatus status, User employer) {
        Job job = new Job();
        job.setId(id);
        job.setStatus(status);
        job.setEmployer(employer);
        return job;
    }
}
