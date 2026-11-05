
package com.fitnesstracker.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

// Defines the JSON submitted when creating or updating a fitness goal.
//
// The request deliberately excludes trainerId and trainerCustomerId.
// The controller obtains trainerId from Spring Security and
// assignmentId from the URL, then the service verifies ownership.
public record CustomerGoalRequest(

        // Every goal needs a meaningful title.
        // Reject null, empty, and whitespace-only values.
        @NotBlank(message = "Goal title is required")
        @Size(max = 255, message = "Goal title must not exceed 255 characters")
        String title,

        // Optional explanation of what the trainer wants to achieve.
        // Allow null, but limit excessively long descriptions.
        @Size(max = 2000, message = "Description must not exceed 2000 characters")
        String description,

        // Optional deadline, represented as YYYY-MM-DD in JSON.
        // Past dates are allowed because trainers may record existing goals.
        LocalDate targetDate,

        // Optional target number of training sessions.
        // When provided, it must be greater than zero.
        @Positive(message = "Target sessions must be greater than zero")
        Integer targetSessions

) {
}
