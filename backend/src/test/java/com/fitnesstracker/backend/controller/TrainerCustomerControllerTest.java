
package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.model.TrainerCustomer;
import com.fitnesstracker.backend.repository.TrainerCustomerRepository;
import com.fitnesstracker.backend.repository.TrainerRepository;
import com.fitnesstracker.backend.service.UniversityCustomerClient;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TrainerCustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TrainerRepository trainerRepository;

    @Autowired
    private TrainerCustomerRepository trainerCustomerRepository;

    // Replace the real external API client with a Mockito mock.
    // Tests must not depend on the university server being online.
    @MockitoBean
    private UniversityCustomerClient universityCustomerClient;

    // Create a real trainer in our test database.
    // Unique emails prevent collisions with other test data.
    private Trainer createTrainer() {
        return trainerRepository.save(new Trainer(
                "Test",
                "Trainer",
                UUID.randomUUID() + "@example.com",
                "test-password-hash"
        ));
    }

    // Simulate the same authentication principal used by TrainerController.
    // The principal is the trainer's database ID, not their email.
    private Authentication trainerAuthentication(Trainer trainer) {
        return UsernamePasswordAuthenticationToken.authenticated(
                trainer.getId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TRAINER"))
        );
    }

    // Insert an assignment directly for tests that need existing data.
    private TrainerCustomer createAssignment(
            Trainer trainer,
            Long universityCustomerId) {

        return trainerCustomerRepository.save(
                new TrainerCustomer(trainer, universityCustomerId)
        );
    }

    @Test
    void shouldRejectUnauthenticatedAssignmentRequests() throws Exception {

        // Spring Security must reject requests without authentication.
        mockMvc.perform(get("/api/trainer-customers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectAssignmentWithoutCsrfToken() throws Exception {

        Trainer trainer = createTrainer();

        // Authentication alone is insufficient for POST requests.
        // A valid CSRF token is also required.
        mockMvc.perform(post("/api/trainer-customers")
                        .with(authentication(trainerAuthentication(trainer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityCustomerId\":1002}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldAssignExistingUniversityCustomer() throws Exception {

        Trainer trainer = createTrainer();

        // Simulate an existing customer in the university API.
        when(universityCustomerClient.customerExists(1002L))
                .thenReturn(true);

        mockMvc.perform(post("/api/trainer-customers")
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityCustomerId\":1002}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.universityCustomerId").value(1002))
                .andExpect(jsonPath("$.assignedAt", notNullValue()));

        // Verify that the assignment was actually saved in PostgreSQL.
        assertTrue(trainerCustomerRepository
                .existsByTrainer_IdAndUniversityCustomerId(
                        trainer.getId(), 1002L));
    }

    @Test
    void shouldRejectDuplicateAssignment() throws Exception {

        Trainer trainer = createTrainer();
        createAssignment(trainer, 1002L);

        // A second assignment of the same customer must return 409.
        mockMvc.perform(post("/api/trainer-customers")
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityCustomerId\":1002}"))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldRejectNonexistentUniversityCustomer() throws Exception {

        Trainer trainer = createTrainer();

        // The mocked client returns false for this unknown customer.
        when(universityCustomerClient.customerExists(999999L))
                .thenReturn(false);

        mockMvc.perform(post("/api/trainer-customers")
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityCustomerId\":999999}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldListOnlyOwnAssignments() throws Exception {

        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();

        createAssignment(trainerA, 1002L);
        createAssignment(trainerB, 2003L);

        // Trainer A must see only their own customer assignment.
        mockMvc.perform(get("/api/trainer-customers")
                        .with(authentication(trainerAuthentication(trainerA))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].universityCustomerId").value(1002));
    }

    @Test
    void shouldPreventAccessToAnotherTrainersAssignment()
            throws Exception {

        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();

        TrainerCustomer assignment = createAssignment(trainerA, 1002L);

        // Trainer B cannot retrieve Trainer A's assignment.
        // Return 404 to avoid revealing whether it exists.
        mockMvc.perform(get("/api/trainer-customers/{id}",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainerB))))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldPreventDeletingAnotherTrainersAssignment()
            throws Exception {

        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();

        TrainerCustomer assignment = createAssignment(trainerA, 1002L);

        mockMvc.perform(delete("/api/trainer-customers/{id}",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainerB)))
                        .with(csrf()))
                .andExpect(status().isNotFound());

        // Ownership rejection must not delete the database record.
        assertTrue(trainerCustomerRepository.existsById(assignment.getId()));
    }

    @Test
    void shouldAllowTrainerToDeleteOwnAssignment() throws Exception {

        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer, 1002L);

        mockMvc.perform(delete("/api/trainer-customers/{id}",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        // The assignment must actually be removed from PostgreSQL.
        assertFalse(trainerCustomerRepository.existsById(assignment.getId()));
    }
}
