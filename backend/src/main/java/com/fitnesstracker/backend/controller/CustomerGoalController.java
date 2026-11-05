
package com.fitnesstracker.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnesstracker.backend.dto.CustomerGoalRequest;
import com.fitnesstracker.backend.dto.CustomerGoalResponse;
import com.fitnesstracker.backend.dto.CustomerGoalStatusRequest;
import com.fitnesstracker.backend.service.CustomerGoalService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trainer-customers/{assignmentId}/goals")
public class CustomerGoalController {

    private final CustomerGoalService customerGoalService;

    // Spring injects the service through constructor injection.
    public CustomerGoalController(CustomerGoalService customerGoalService) {
        this.customerGoalService = customerGoalService;
    }

    // Create a goal for a customer assigned to the logged-in trainer.
    @PostMapping
    public ResponseEntity<CustomerGoalResponse> createGoal(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId,
            @Valid @RequestBody CustomerGoalRequest request) {

        // The service verifies that assignmentId belongs to trainerId.
        // The frontend cannot choose or impersonate another trainer.
        CustomerGoalResponse goal = customerGoalService.createGoal(
                trainerId,
                assignmentId,
                request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(goal);
    }

    // List goals for one trainer-owned customer assignment.
    @GetMapping
    public ResponseEntity<List<CustomerGoalResponse>> getGoals(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId) {

        List<CustomerGoalResponse> goals = customerGoalService.getGoals(
                trainerId,
                assignmentId);

        return ResponseEntity.ok(goals);
    }

    // Retrieve a single goal belonging to the current trainer.
    @GetMapping("/{goalId}")
    public ResponseEntity<CustomerGoalResponse> getGoal(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId,
            @PathVariable Long goalId) {

        CustomerGoalResponse goal = customerGoalService.getGoal(
                trainerId,
                assignmentId,
                goalId);

        return ResponseEntity.ok(goal);
    }

    // Update a goal's title, description, deadline, or session target.
    // PUT replaces the editable goal details using the request body.
    @PutMapping("/{goalId}")
    public ResponseEntity<CustomerGoalResponse> updateGoal(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId,
            @PathVariable Long goalId,
            @Valid @RequestBody CustomerGoalRequest request) {

        CustomerGoalResponse goal = customerGoalService.updateGoal(
                trainerId,
                assignmentId,
                goalId,
                request);

        return ResponseEntity.ok(goal);
    }

    // Change only the goal's status.
    // PATCH avoids requiring the client to resend all goal details.
    @PatchMapping("/{goalId}/status")
    public ResponseEntity<CustomerGoalResponse> changeGoalStatus(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId,
            @PathVariable Long goalId,
            @Valid @RequestBody CustomerGoalStatusRequest request) {

        CustomerGoalResponse goal = customerGoalService.changeGoalStatus(
                trainerId,
                assignmentId,
                goalId,
                request.status());

        return ResponseEntity.ok(goal);
    }

    // Delete a goal only when it belongs to the authenticated trainer.
    @DeleteMapping("/{goalId}")
    public ResponseEntity<Void> deleteGoal(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long assignmentId,
            @PathVariable Long goalId) {

        customerGoalService.deleteGoal(
                trainerId,
                assignmentId,
                goalId);

        // HTTP 204 indicates successful deletion without a response body.
        return ResponseEntity.noContent().build();
    }
}
