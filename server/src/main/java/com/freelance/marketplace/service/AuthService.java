package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.AuthRequest;
import com.freelance.marketplace.dto.AuthResponse;
import com.freelance.marketplace.dto.LoginRequest;
import com.freelance.marketplace.entity.EmployerProfile;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.StudentProfile;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.BadRequestException;
import com.freelance.marketplace.repository.UserRepository;
import com.freelance.marketplace.util.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtUtil jwtUtil
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already in use");
        }

        Role selectedRole = request.role() == null ? Role.STUDENT : request.role();
        if (selectedRole == Role.ADMIN) {
            throw new BadRequestException("Admin registration is not allowed");
        }

        String normalizedUsername = request.username() == null || request.username().isBlank()
                ? request.email().split("@")[0]
                : request.username();

        if (userRepository.existsByUsername(normalizedUsername)) {
            normalizedUsername = normalizedUsername + System.currentTimeMillis();
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setRole(selectedRole);
        user.setEnabled(true);

        User saved = userRepository.save(user);

        if (selectedRole == Role.STUDENT) {
            StudentProfile profile = new StudentProfile();
            profile.setBio("");
            profile.setAddress("");
            profile.setCvUrl("");
            profile.setSkills("");
            saved.setStudentProfile(profile);
        } else {
            EmployerProfile profile = new EmployerProfile();
            profile.setCompanyName("");
            profile.setDescription("");
            profile.setWebsite("");
            profile.setLocation("");
            saved.setEmployerProfile(profile);
        }

        userRepository.save(saved);

        String token = jwtUtil.generateToken(saved.getEmail(), saved.getRole().name());
        return new AuthResponse(token, saved.getRole().name(), saved.getEmail(), saved.getName());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.emailOrUsername(), request.password())
        );

        User user = userRepository.findByEmail(request.emailOrUsername())
                .or(() -> userRepository.findByUsername(request.emailOrUsername()))
                .orElseThrow(() -> new BadRequestException("Invalid email/username or password"));

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getName());
    }
}
