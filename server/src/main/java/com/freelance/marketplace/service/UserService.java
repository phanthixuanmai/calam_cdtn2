package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.UpdateProfileRequest;
import com.freelance.marketplace.entity.EmployerProfile;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.StudentProfile;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.EmployerProfileRepository;
import com.freelance.marketplace.repository.StudentProfileRepository;
import com.freelance.marketplace.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EmployerProfileRepository employerProfileRepository;

    public UserService(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            EmployerProfileRepository employerProfileRepository
    ) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.employerProfileRepository = employerProfileRepository;
    }

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new BadRequestException("Authentication required");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public Map<String, Object> getMyProfile() {
        User user = getCurrentUser();
        Map<String, Object> profile = new java.util.HashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("username", user.getUsername());
        profile.put("name", user.getName());
        profile.put("phone", user.getPhone());
        profile.put("role", user.getRole().name());

        if (user.getRole() == Role.STUDENT) {
            StudentProfile profileEntity = user.getStudentProfile();
            profile.put("bio", profileEntity != null ? profileEntity.getBio() : "");
            profile.put("address", profileEntity != null ? profileEntity.getAddress() : "");
            profile.put("cvUrl", profileEntity != null ? profileEntity.getCvUrl() : "");
            profile.put("skills", profileEntity != null ? profileEntity.getSkills() : "");
        }

        if (user.getRole() == Role.EMPLOYER) {
            EmployerProfile employerProfile = user.getEmployerProfile();
            profile.put("companyName", employerProfile != null ? employerProfile.getCompanyName() : "");
            profile.put("description", employerProfile != null ? employerProfile.getDescription() : "");
            profile.put("website", employerProfile != null ? employerProfile.getWebsite() : "");
            profile.put("location", employerProfile != null ? employerProfile.getLocation() : "");
        }

        return profile;
    }

    public User updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }
        userRepository.save(user);

        if (user.getRole() == Role.STUDENT) {
            StudentProfile profile = user.getStudentProfile();
            if (profile == null) {
                profile = new StudentProfile();
            }
            if (request.bio() != null) profile.setBio(request.bio());
            if (request.address() != null) profile.setAddress(request.address());
            if (request.skills() != null) profile.setSkills(request.skills());
            if (request.cvUrl() != null) profile.setCvUrl(request.cvUrl());
            user.setStudentProfile(profile);
            studentProfileRepository.save(profile);
        }

        if (user.getRole() == Role.EMPLOYER) {
            EmployerProfile profile = user.getEmployerProfile();
            if (profile == null) {
                profile = new EmployerProfile();
            }
            if (request.companyName() != null) profile.setCompanyName(request.companyName());
            if (request.description() != null) profile.setDescription(request.description());
            if (request.website() != null) profile.setWebsite(request.website());
            if (request.location() != null) profile.setLocation(request.location());
            user.setEmployerProfile(profile);
            employerProfileRepository.save(profile);
        }

        return userRepository.save(user);
    }
}
