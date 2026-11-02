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

import com.fitnesstracker.backend.exception.DuplicateEmailException;
import com.fitnesstracker.backend.dto.TrainerLoginRequest;
import com.fitnesstracker.backend.exception.InvalidCredentialsException;

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
                                "SecurePassword123!");

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
                                savedTrainer.getPasswordHash()));
        }

        @Test
        void shouldRejectDuplicateEmail() {

                TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                                "Alex",
                                "Smith",
                                "alex.duplicate@example.com",
                                "SecurePassword123!");

                trainerService.registerTrainer(request);

                // A second registration with the same email must be rejected.
                DuplicateEmailException exception = assertThrows(
                                DuplicateEmailException.class,
                                () -> trainerService.registerTrainer(request));

                assertEquals("Email already registered", exception.getMessage());
        }

        @Test
        void shouldLoginWithCorrectCredentials() {

                // Arrange: register a trainer so PostgreSQL contains a real
                // BCrypt password hash for the login test.
                trainerService.registerTrainer(new TrainerRegistrationRequest(
                                "Jamie",
                                "Taylor",
                                "jamie.login@example.com",
                                "SecurePassword123!"));

                // Act: log in using the same credentials.
                TrainerResponse response = trainerService.loginTrainer(
                                new TrainerLoginRequest(
                                                "jamie.login@example.com",
                                                "SecurePassword123!"));

                // Assert: the service returns the correct trainer.
                assertNotNull(response.id());
                assertEquals("jamie.login@example.com", response.email());
                assertEquals("Jamie", response.firstName());
        }

        @Test
        void shouldRejectIncorrectPassword() {

                // Arrange: create a real trainer account.
                trainerService.registerTrainer(new TrainerRegistrationRequest(
                                "Jamie",
                                "Taylor",
                                "jamie.wrongpassword@example.com",
                                "CorrectPassword123!"));

                // Act and assert: an incorrect password must be rejected.
                InvalidCredentialsException exception = assertThrows(
                                InvalidCredentialsException.class,
                                () -> trainerService.loginTrainer(
                                                new TrainerLoginRequest(
                                                                "jamie.wrongpassword@example.com",
                                                                "WrongPassword123!")));

                // Do not reveal whether the email or password was incorrect.
                assertEquals("Invalid email or password", exception.getMessage());
        }

        @Test
        void shouldRejectUnknownEmail() {

                // No trainer is registered with this email.
                // The response must match the incorrect-password case.
                InvalidCredentialsException exception = assertThrows(
                                InvalidCredentialsException.class,
                                () -> trainerService.loginTrainer(
                                                new TrainerLoginRequest(
                                                                "unknown.login@example.com",
                                                                "SomePassword123!")));

                assertEquals("Invalid email or password", exception.getMessage());
        }
}