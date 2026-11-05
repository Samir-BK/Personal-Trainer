
package com.fitnesstracker.backend.dto;

import com.fitnesstracker.backend.model.CustomerGoal.GoalStatus;

import jakarta.validation.constraints.NotNull;

// Defines the JSON body for changing a customer's fitness goal status.
//
// Only the status can be changed through this request.
// The goal ID and assignment ID come from the URL.
// The trainer ID comes from the authenticated Spring Security session.
public record CustomerGoalStatusRequest(

        // A status is required; null or a missing field is rejected.
        // GoalStatus restricts values to ACTIVE, COMPLETED, or CANCELLED.
        @NotNull(message = "Goal status is required")
        GoalStatus status

) {
}
