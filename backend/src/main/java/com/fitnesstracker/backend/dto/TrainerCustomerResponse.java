
package com.fitnesstracker.backend.dto;

import java.time.Instant;

import com.fitnesstracker.backend.model.TrainerCustomer;

// Defines the public JSON representation of a customer assignment.
// Never exposes the Trainer entity or its password hash.
public record TrainerCustomerResponse(
        Long id,
        Long universityCustomerId,
        Instant assignedAt
) {

    // Convert a database entity into a safe API response.
    // The trainer ID is intentionally omitted because ownership
    // is determined from the authenticated session.
    public static TrainerCustomerResponse fromEntity(
            TrainerCustomer assignment) {

        return new TrainerCustomerResponse(
                assignment.getId(),
                assignment.getUniversityCustomerId(),
                assignment.getAssignedAt()
        );
    }
}
