
package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// Defines the JSON body required to assign a university customer.
// The trainer ID is deliberately excluded: it comes from the
// authenticated Spring Security session.
public record TrainerCustomerAssignmentRequest(

        @NotNull(message = "University customer ID is required")
        @Positive(message = "University customer ID must be positive")
        Long universityCustomerId

) {
}
