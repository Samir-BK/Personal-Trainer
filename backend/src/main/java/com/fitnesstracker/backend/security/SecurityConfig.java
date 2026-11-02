package com.fitnesstracker.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt automatically generates a salt and stores it within the hash.
        // This means identical passwords can produce different hashes.
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // For this stateless JSON API, disable the default CSRF protection.
                // Revisit this if authentication later uses browser cookies.
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        // New trainers must be able to register without login
                        .requestMatchers(HttpMethod.POST, "/api/trainers/register").permitAll()

                        // Existing trainers must be able to submit credentials
                        // before they have an authenticated session.
                        .requestMatchers(HttpMethod.POST, "/api/trainers/login").permitAll()
                        
                        // Everything else requires authentication.
                        .anyRequest().authenticated());

        return http.build();
    }
}
