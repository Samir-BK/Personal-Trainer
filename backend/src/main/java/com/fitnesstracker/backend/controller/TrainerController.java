package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.TrainerRegistrationRequest;
import com.fitnesstracker.backend.dto.TrainerLoginRequest;
import com.fitnesstracker.backend.dto.TrainerResponse;
import com.fitnesstracker.backend.service.TrainerService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@RestController
@RequestMapping("/api/trainers") // Base URL for everything in this class. Any method inside gets this as a
                                 // prefix.
public class TrainerController {

    private final TrainerService trainerService;

    private final SecurityContextRepository securityContextRepository;

    // Spring injects the service through the constructor.
    public TrainerController(TrainerService trainerService, SecurityContextRepository securityContextRepository) {
        this.trainerService = trainerService;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<TrainerResponse> registerTrainer(
            @Valid @RequestBody TrainerRegistrationRequest request) {
        TrainerResponse response = trainerService.registerTrainer(request);

        // HTTP 201 means a new resource was created successfully.
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<TrainerResponse> loginTrainer(
            @Valid @RequestBody TrainerLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        // First, verify the credentials against the BCrypt hash in PostgreSQL.
        // If they are incorrect, TrainerService throws InvalidCredentialsException.
        TrainerResponse trainer = trainerService.loginTrainer(request);

        // Prevent an existing session ID from being reused after login.
        // This protects against session fixation.
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }

        // Create a Spring Security Authentication object.
        // The trainer ID is the principal, which we can later use to
        // enforce ownership of goals and private notes.
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                trainer.id(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TRAINER")));

        // Create a new security context for this authenticated trainer.
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        // Save the authentication in the HTTP session.
        // Later requests can identify the trainer through JSESSIONID.
        securityContextRepository.saveContext(
                context,
                httpRequest,
                httpResponse);

        return ResponseEntity.ok(trainer);
    }

    @GetMapping("/me")
public ResponseEntity<TrainerResponse> getCurrentTrainer(
        @AuthenticationPrincipal Long trainerId
) {
    // Spring Security obtains this ID from the authenticated session,
    // not from an ID supplied by the frontend.
    TrainerResponse trainer = trainerService.getTrainerById(trainerId);

    return ResponseEntity.ok(trainer);
}
}
