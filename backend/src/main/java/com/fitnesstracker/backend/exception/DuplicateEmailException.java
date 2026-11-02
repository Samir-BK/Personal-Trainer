package com.fitnesstracker.backend.exception;

// Represents a registration attempt using an email that already exists.
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String message) {
        super(message);
    }
}