package com.fitnesstracker.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {


    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt automatically generates a salt and stores it within the hash.
        // This means identical passwords can produce different hashes.
        return new BCryptPasswordEncoder();
    }
}
