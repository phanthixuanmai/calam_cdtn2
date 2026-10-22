package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.DashboardStats;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.JobStatus;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.ApplicationRepository;
import com.freelance.marketplace.repository.JobRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;

    public AdminService(
            UserRepository userRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository
    ) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    public DashboardStats getDashboardStats() {
        long students = userRepository.findAll().stream().filter(user -> user.getRole() == Role.STUDENT).count();
        long employers = userRepository.findAll().stream().filter(user -> user.getRole() == Role.EMPLOYER).count();
        long jobs = jobRepository.count();
        long applications = applicationRepository.count();
        long completedJobs = jobRepository.findAll().stream().filter(job -> job.getStatus() == JobStatus.COMPLETED).count();
        return new DashboardStats(students, employers, jobs, applications, completedJobs);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User toggleUserStatus(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setEnabled(!user.isEnabled());
        return userRepository.save(user);
    }

    public List<Job> getAllJobsForAdmin() {
        return jobRepository.findAll();
    }
}
