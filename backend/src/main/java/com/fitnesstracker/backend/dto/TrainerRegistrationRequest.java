package com.fitnesstracker.backend.dto;


/**
 * DTO (Data Transfer Object) for the trainer registration request.
 * Carries the data sent by the client when a new trainer signs up.
 * A record is immutable: values are set once and can't be changed.
 */
public record TrainerRegistrationRequest(
        String firstName,
        String lastName,
        String email,
        String password // raw password from the request, hash it (BCrypt) before saving
) {
}