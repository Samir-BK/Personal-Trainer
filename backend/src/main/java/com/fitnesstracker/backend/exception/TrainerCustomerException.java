
package com.fitnesstracker.backend.exception;

import org.springframework.http.HttpStatus;

public class TrainerCustomerException extends RuntimeException {

    private final HttpStatus status;

    public TrainerCustomerException(
            HttpStatus status,
            String message) {

        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
