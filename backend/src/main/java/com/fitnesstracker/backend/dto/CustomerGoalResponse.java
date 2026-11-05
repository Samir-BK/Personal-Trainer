
package com.fitnesstracker.backend.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.fitnesstracker.backend.model.CustomerGoal;
import com.fitnesstracker.backend.model.CustomerGoal.GoalStatus;

// Defines the public JSON response for a customer's fitness goal.
//
// We deliberately do not expose the Trainer or TrainerCustomer entities.
// The backend checks ownership before returning this DTO.
public record CustomerGoalResponse(

        // Unique identifier of the goal in our PostgreSQL database.
        Long id,

        // Identifies the trainer-customer assignment that owns this goal.
        Long assignmentId,

        // Fitness goal details entered by the trainer.
        String title,
        String description,
        LocalDate targetDate,
        Integer targetSessions,

        // Current goal state: ACTIVE, COMPLETED, or CANCELLED.
        GoalStatus status,

        // Timestamps generated and maintained by the backend.
        Instant createdAt,
        Instant updatedAt

) {

    // Converts a JPA entity into a safe response for React.
    // Call this only after the service has verified trainer ownership.
    public static CustomerGoalResponse fromEntity(CustomerGoal goal) {

        return new CustomerGoalResponse(
                goal.getId(),
                goal.getTrainerCustomer().getId(),
                goal.getTitle(),
                goal.getDescription(),
                goal.getTargetDate(),
                goal.getTargetSessions(),
                goal.getStatus(),
                goal.getCreatedAt(),
                goal.getUpdatedAt()
        );
    }
}
