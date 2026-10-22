package com.freelance.marketplace.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    @Test
    void handleAuthentication_shouldReturnUnauthorized() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<?> response = handler.handleAuthentication(new BadCredentialsException("Bad credentials"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}