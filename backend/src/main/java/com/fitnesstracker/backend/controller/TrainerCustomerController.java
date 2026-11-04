package com.fitnesstracker.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnesstracker.backend.dto.TrainerCustomerAssignmentRequest;
import com.fitnesstracker.backend.dto.TrainerCustomerResponse;
import com.fitnesstracker.backend.service.TrainerCustomerService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trainer-customers")
public class TrainerCustomerController {

    private final TrainerCustomerService trainerCustomerService;

    // Spring injects the service through the constructor.
    public TrainerCustomerController(TrainerCustomerService trainerCustomerService) {
        this.trainerCustomerService = trainerCustomerService;
    }

    @PostMapping
    public ResponseEntity<TrainerCustomerResponse> assignCustomer(
            @AuthenticationPrincipal Long trainerId,
            @Valid @RequestBody TrainerCustomerAssignmentRequest request) {

        // The trainer ID comes from the authenticated session.
        // Never accept a trainer ID from the request body.
        var assignment = trainerCustomerService.assignCustomer(
                trainerId,
                request.universityCustomerId());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(TrainerCustomerResponse.fromEntity(assignment));
    }

    @GetMapping
    public ResponseEntity<List<TrainerCustomerResponse>> getAssignedCustomers(
            @AuthenticationPrincipal Long trainerId) {

        // Only retrieve assignments belonging to the logged-in trainer.
        List<TrainerCustomerResponse> assignments = trainerCustomerService.getAssignmentsForTrainer(trainerId)
                .stream()
                .map(TrainerCustomerResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrainerCustomerResponse> getAssignment(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long id) {

        // The service checks both the assignment ID and trainer ownership.
        var assignment = trainerCustomerService.getAssignment(trainerId, id);

        return ResponseEntity.ok(
                TrainerCustomerResponse.fromEntity(assignment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeAssignment(
            @AuthenticationPrincipal Long trainerId,
            @PathVariable Long id) {

        // The service verifies ownership before deleting.
        trainerCustomerService.removeAssignment(trainerId, id);

        // Successful deletion does not require a response body.
        return ResponseEntity.noContent().build();
    }
}
