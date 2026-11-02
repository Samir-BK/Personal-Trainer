
package com.fitnesstracker.backend.controller;

import tools.jackson.databind.ObjectMapper;
import com.fitnesstracker.backend.dto.TrainerRegistrationRequest;
import com.fitnesstracker.backend.service.TrainerService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.HttpSession;

import com.fitnesstracker.backend.dto.TrainerLoginRequest;

import org.springframework.mock.web.MockHttpSession;

// These static imports make test assertions easier to read.
// For example, we can write status().isCreated() instead of
// MockMvcResultMatchers.status().isCreated().
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
// Loads the real Spring Boot application context, including our
// controller, service, repository, security configuration, and database.
@AutoConfigureMockMvc
// Configures MockMvc so we can test HTTP requests without starting
// a separate web server on port 8080.
@Transactional
// Rolls back database changes after each test.
// This prevents test registrations from remaining in PostgreSQL.
class TrainerControllerTest {

    @Autowired
    private MockMvc mockMvc;
    // Simulates HTTP requests through Spring MVC.
    // Spring Security filters are included in these requests.

    @Autowired
    private ObjectMapper objectMapper;
    // Converts Java objects into JSON, just like React would send
    // JSON in the body of an HTTP request.

    @Autowired
    private TrainerService trainerService;

    @Test
    void shouldRegisterTrainer() throws Exception {

        // Arrange: create a valid registration request.
        TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                "Alex",
                "Smith",
                "alex.controller@example.com",
                "SecurePassword123!");

        // Act: simulate POST /api/trainers/register.
        mockMvc.perform(
                post("/api/trainers/register")
                        // Tell Spring that the request body contains JSON.
                        .contentType(MediaType.APPLICATION_JSON)

                        // Convert our Java request object into JSON text.
                        .content(objectMapper.writeValueAsString(request)))

                // Assert: successful registration must return HTTP 201.
                .andExpect(status().isCreated())

                // Verify that the response contains the registered email.
                .andExpect(jsonPath("$.email")
                        .value("alex.controller@example.com"))

                // Security check: never expose the original password.
                .andExpect(jsonPath("$.password").doesNotExist())

                // Security check: never expose the stored BCrypt hash.
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void shouldRejectInvalidRegistration() throws Exception {

        // Arrange: intentionally submit three invalid fields.
        // Empty first name violates @NotBlank.
        // Invalid email violates @Email.
        // Short password violates @Size(min = 8).
        TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                "",
                "Smith",
                "invalid-email",
                "123");

        // Act: send the invalid registration request.
        mockMvc.perform(
                post("/api/trainers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))

                // Assert: invalid input must return HTTP 400 Bad Request.
                .andExpect(status().isBadRequest())

                // Verify that our GlobalExceptionHandler was used.
                .andExpect(jsonPath("$.error")
                        .value("Validation failed"))

                // Verify that React receives errors for all invalid fields.
                // React can use these keys to display messages beside inputs.
                .andExpect(jsonPath("$.fields.firstName").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {

        // Arrange: create a valid request that we will send twice.
        TrainerRegistrationRequest request = new TrainerRegistrationRequest(
                "Alex",
                "Smith",
                "duplicate.controller@example.com",
                "SecurePassword123!");

        // Convert once so both HTTP requests contain identical JSON.
        String json = objectMapper.writeValueAsString(request);

        // First request: registration should succeed.
        // The trainer is saved through the real service and repository.
        mockMvc.perform(
                post("/api/trainers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());

        // Second request: the email already exists.
        // TrainerService throws DuplicateEmailException.
        // GlobalExceptionHandler converts it to HTTP 409 Conflict.
        mockMvc.perform(
                post("/api/trainers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict())

                // Verify that the client receives a useful error message.
                .andExpect(jsonPath("$.error")
                        .value("Email already registered"));
    }

    @Test
    void shouldAccessTrainerProfileAfterLogin() throws Exception {

        // Arrange: register a trainer using the real service and database.
        // The password will be stored as a BCrypt hash.
        trainerService.registerTrainer(new TrainerRegistrationRequest(
                "Jamie",
                "Taylor",
                "jamie.session@example.com",
                "SecurePassword123!"));

        // Prepare the login credentials that React would submit.
        TrainerLoginRequest loginRequest = new TrainerLoginRequest(
                "jamie.session@example.com",
                "SecurePassword123!");

        // Act: log in through the HTTP endpoint.
        // Save the session created by Spring Security.
        MockHttpSession session = (MockHttpSession) mockMvc.perform(
                post("/api/trainers/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(request().sessionAttribute(
                        "SPRING_SECURITY_CONTEXT",
                        org.hamcrest.Matchers.notNullValue()))
                .andReturn()
                .getRequest()
                .getSession(false);

        // Assert: reuse the same session on a protected HTTP request.
        // Spring Security should recognize the logged-in trainer.
        mockMvc.perform(
                get("/api/trainers/me")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email")
                        .value("jamie.session@example.com"));
    }

    @Test
    void shouldRejectUnauthenticatedProfileRequest() throws Exception {

        // No login request and no session cookie are provided.
        // Therefore, Spring Security must deny access.
        mockMvc.perform(get("/api/trainers/me"))
                .andExpect(status().isUnauthorized());
    }
}
