package com.fitnesstracker.backend.exception;

// Represents a failed login attempt.
// We use the same error for an unknown email and an incorrect password
// so the API does not reveal which trainer accounts exist.
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}