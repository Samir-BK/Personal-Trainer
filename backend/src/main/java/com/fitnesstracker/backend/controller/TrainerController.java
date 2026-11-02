package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.TrainerRegistrationRequest;
import com.fitnesstracker.backend.dto.TrainerResponse;
import com.fitnesstracker.backend.service.TrainerService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController 
@RequestMapping("/api/trainers") // Base URL for everything in this class. Any method inside gets this as a prefix.
public class TrainerController {

    private final TrainerService trainerService;

    // Spring injects the service through the constructor.
    public TrainerController(TrainerService trainerService) {
        this.trainerService = trainerService;
    }

    @PostMapping("/register")
    public ResponseEntity<TrainerResponse> registerTrainer(
            @Valid @RequestBody TrainerRegistrationRequest request
    ) {
        TrainerResponse response = trainerService.registerTrainer(request);

        // HTTP 201 means a new resource was created successfully.
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
    
}
