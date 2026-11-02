package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


/**
 * DTO (Data Transfer Object) for the trainer registration request.
 * Carries the data sent by the client when a new trainer signs up.
 * A record is immutable: values are set once and can't be changed.
 */
public record TrainerRegistrationRequest(
        // Reject null, empty, and whitespace-only names.
        @NotBlank(message="First name is required")
        String firstName,

        @NotBlank(message= "Last name is required")
        String lastName,

        // Require an email-like format.
        @NotBlank(message="Email is required")
        @Email(message= "Email must be valid    ")
        String email,

        @NotBlank (message="Password is required")
        @Size(min = 8, message = "Password must contain at least 8 characters")
        String password // raw password from the request, hash it (BCrypt) before saving
) {
}