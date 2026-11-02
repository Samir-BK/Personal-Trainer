package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.TrainerRegistrationRequest;
import com.fitnesstracker.backend.dto.TrainerResponse;
import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.repository.TrainerRepository;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional // Roll back database changes after each test.
class TrainerServiceTest {

    @Autowired
    private TrainerService trainerService;

    @Autowired
    private TrainerRepository trainerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    @Test
    void shouldRegisterTrainerWithHashedPassword() {

        TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                "Alex",
                "Smith",
                "alex.registration@example.com",
                "SecurePassword123!"
        );

        TrainerResponse response = trainerService.registerTrainer(request);

        // Flush changes and clear JPA's cache so we verify persisted data.
        entityManager.flush();
        entityManager.clear();

        Trainer savedTrainer = trainerRepository
                .findByEmail("alex.registration@example.com")
                .orElseThrow();

        assertNotNull(response.id());
        assertEquals("Alex", response.firstName());
        assertEquals("Smith", response.lastName());
        assertEquals("alex.registration@example.com", response.email());

        // The original password must never be stored in PostgreSQL.
        assertNotEquals(request.password(), savedTrainer.getPasswordHash());

        // Verify that the stored hash matches the original password.
        assertTrue(passwordEncoder.matches(
                request.password(),
                savedTrainer.getPasswordHash()
        ));
    }

    @Test
    void shouldRejectDuplicateEmail() {

        TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                "Alex",
                "Smith",
                "alex.duplicate@example.com",
                "SecurePassword123!"
        );

        trainerService.registerTrainer(request);

        // A second registration with the same email must be rejected.
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> trainerService.registerTrainer(request)
        );

        assertEquals("Email already registered", exception.getMessage());
    }
}