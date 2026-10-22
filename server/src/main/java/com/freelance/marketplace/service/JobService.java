package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.JobRequest;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final UserService userService;

    public JobService(JobRepository jobRepository, UserService userService) {
        this.jobRepository = jobRepository;
        this.userService = userService;
    }

    public List<Job> getAllJobs(String keyword, String category, String location, String status) {
        JobStatus jobStatus = status == null || status.isBlank() ? null : JobStatus.valueOf(status.toUpperCase());
        List<Job> jobs = jobRepository.findAll();

        return jobs.stream()
                .filter(job -> keyword == null || keyword.isBlank()
                        || job.getTitle().toLowerCase().contains(keyword.toLowerCase())
                        || (job.getDescription() != null && job.getDescription().toLowerCase().contains(keyword.toLowerCase())))
                .filter(job -> category == null || category.isBlank() || category.equalsIgnoreCase(job.getCategory()))
                .filter(job -> location == null || location.isBlank()
                        || (job.getLocation() != null && job.getLocation().toLowerCase().contains(location.toLowerCase())))
                .filter(job -> jobStatus == null || job.getStatus() == jobStatus)
                .toList();
    }

    public Job getJobById(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
    }

    public Job createJob(JobRequest request) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.getRole() != Role.EMPLOYER && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("Only employers can post jobs");
        }

        Job job = new Job();
        job.setTitle(request.title());
        job.setDescription(request.description());
        job.setCategory(request.category());
        job.setLocation(request.location());
        job.setSalaryRange(request.salaryRange());
        job.setStatus(request.status() != null ? request.status() : JobStatus.OPEN);
        job.setEmployer(currentUser);
        job.setStartDate(request.startDate());
        job.setEndDate(request.endDate());

        return jobRepository.save(job);
    }

    public Job updateJob(String id, JobRequest request) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!job.getEmployer().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("You are not allowed to modify this job");
        }

        if (request.title() != null) job.setTitle(request.title());
        if (request.description() != null) job.setDescription(request.description());
        if (request.category() != null) job.setCategory(request.category());
        if (request.location() != null) job.setLocation(request.location());
        if (request.salaryRange() != null) job.setSalaryRange(request.salaryRange());
        if (request.status() != null) job.setStatus(request.status());
        if (request.startDate() != null) job.setStartDate(request.startDate());
        if (request.endDate() != null) job.setEndDate(request.endDate());

        return jobRepository.save(job);
    }

    public void deleteJob(String id) {
        Job job = getJobById(id);
        User currentUser = userService.getCurrentUser();
        if (!job.getEmployer().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("You are not allowed to delete this job");
        }
        jobRepository.delete(job);
    }
}
