package com.fitnesstracker.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import com.fitnesstracker.backend.exception.InvalidCredentialsException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice // When a controller throws DuplicateEmailException, Spring uses this handler to
                      // return a controlled JSON response.
public class GlobalExceptionHandler {

    // Convert a duplicate-email business error into HTTP 409 Conflict.
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateEmail(
            DuplicateEmailException exception) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException exception) {
        // Collect validation errors using the request field names.
        Map<String, String> fieldErrors = new HashMap<>();

        exception.getBindingResult().getFieldErrors().forEach(error -> fieldErrors.putIfAbsent(
                error.getField(),
                error.getDefaultMessage()));

        // HTTP 400 tells React that the submitted data is invalid.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "Validation failed",
                        "fields", fieldErrors));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleInvalidCredentials(
            InvalidCredentialsException exception) {
        // HTTP 401 means the submitted credentials are not valid.
        // Use the same message for unknown emails and incorrect passwords
        // to avoid revealing which trainer accounts exist.
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", exception.getMessage()));
    }

    // Convert trainer-customer business errors into meaningful HTTP responses.
    // Examples: 400 invalid ID, 404 missing customer, 409 duplicate assignment,
    // and 503 when the university API is unavailable.
    @ExceptionHandler(TrainerCustomerException.class)
    public ResponseEntity<Map<String, String>> handleTrainerCustomerException(
            TrainerCustomerException exception) {

        return ResponseEntity
                .status(exception.getStatus())
                .body(Map.of("error", exception.getMessage()));
    }
}