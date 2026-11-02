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

import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

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
.csrf(csrf -> csrf
        // Store the CSRF token in a cookie so React can read it.
        // Unlike the session cookie, this token must be accessible
        // to JavaScript so Axios can send it in a request header.
        .csrfTokenRepository(
                CookieCsrfTokenRepository.withHttpOnlyFalse()
        )

        // Use the plain CSRF token value in request headers.
        // This is appropriate for a JavaScript client that reads
        // the token from a cookie and sends it back in X-XSRF-TOKEN.
        .csrfTokenRequestHandler(
                new CsrfTokenRequestAttributeHandler()
        )
)                .sessionManagement(session -> session
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
