package com.fitnesstracker.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

public class SecurityConfigTest {
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void shouldHashAndVerifyPassword() {
        String rawPassword = "MySecurePassword123!";

        String hashedPassword = passwordEncoder.encode(rawPassword);

        // A stored hash must never be identical to the original password.
        assertNotEquals(rawPassword, hashedPassword);

        // BCrypt verifies the password against the stored hash.
        assertTrue(passwordEncoder.matches(rawPassword, hashedPassword));

        // An incorrect password must not pass verification.
        assertFalse(passwordEncoder.matches("WrongPassword", hashedPassword));

    }

}   
