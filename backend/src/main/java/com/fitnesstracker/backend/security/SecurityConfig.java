package com.fitnesstracker.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;

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
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/trainers/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/trainers/login").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        // Return 401 when a request has no authenticated trainer.
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                        }))
                .logout(logout -> logout
                        // React sends POST /api/trainers/logout to end the session.
                        .logoutUrl("/api/trainers/logout")

                        // Delete the authenticated session and its security context.
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)

                        // Return HTTP 204 instead of redirecting to a webpage.
                        .logoutSuccessHandler((request, response, authentication) -> {
                            response.setStatus(HttpStatus.NO_CONTENT.value());
                        }));

        return http.build();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {

        // Store authenticated users' security contexts in HTTP sessions.
        // Spring can retrieve the authentication on later requests
        // using the browser's JSESSIONID cookie.
        return new HttpSessionSecurityContextRepository();
    }
}
