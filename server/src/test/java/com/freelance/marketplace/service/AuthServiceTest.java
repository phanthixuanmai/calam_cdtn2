package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.AuthRequest;
import com.freelance.marketplace.dto.AuthResponse;
import com.freelance.marketplace.entity.Role;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.repository.UserRepository;
import com.freelance.marketplace.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    @Test
    void register_shouldUseRequestedRole_forEmployer() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        JwtUtil jwtUtil = mock(JwtUtil.class);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-password");
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("jwt-token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId("emp-1");
            return user;
        });

        AuthService authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtUtil);
        AuthRequest request = new AuthRequest(
                "Employer One",
                "employer@example.com",
                "Pass123!",
                "0900000001",
                "employerone",
                Role.EMPLOYER
        );

        AuthResponse response = authService.register(request);

        assertEquals(Role.EMPLOYER.name(), response.role());
        assertEquals("employer@example.com", response.email());
    }
}
