
package com.fitnesstracker.backend.controller;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fitnesstracker.backend.model.CustomerGoal;
import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.model.TrainerCustomer;
import com.fitnesstracker.backend.repository.CustomerGoalRepository;
import com.fitnesstracker.backend.repository.TrainerCustomerRepository;
import com.fitnesstracker.backend.repository.TrainerRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CustomerGoalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TrainerRepository trainerRepository;

    @Autowired
    private TrainerCustomerRepository trainerCustomerRepository;

    @Autowired
    private CustomerGoalRepository customerGoalRepository;

    // Create a trainer in the real PostgreSQL test database.
    private Trainer createTrainer() {
        return trainerRepository.save(new Trainer(
                "Test",
                "Trainer",
                UUID.randomUUID() + "@example.com",
                "test-password-hash"
        ));
    }

    // Reproduce the authentication structure used by TrainerController:
    // the authenticated principal is the trainer's database ID.
    private Authentication trainerAuthentication(Trainer trainer) {
        return UsernamePasswordAuthenticationToken.authenticated(
                trainer.getId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TRAINER"))
        );
    }

    // Create a trainer-owned customer assignment.
    // These tests do not need to call the external university REST API.
    private TrainerCustomer createAssignment(Trainer trainer) {
        return trainerCustomerRepository.save(
                new TrainerCustomer(trainer, 3L)
        );
    }

    // Insert an existing goal for retrieval, update, and deletion tests.
    private CustomerGoal createGoal(TrainerCustomer assignment) {
        return customerGoalRepository.saveAndFlush(
                new CustomerGoal(
                        assignment,
                        "Complete 12 sessions",
                        "Improve training consistency",
                        null,
                        12
                )
        );
    }

    // Reusable valid JSON request body.
    private static final String VALID_GOAL_JSON = """
            {
              "title": "Complete 12 sessions",
              "description": "Improve training consistency",
              "targetDate": "2027-02-28",
              "targetSessions": 12
            }
            """;

    @Test
    void shouldRejectUnauthenticatedGoalRequests() throws Exception {
        // Goal data must not be accessible without a trainer session.
        mockMvc.perform(get("/api/trainer-customers/1/goals"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRequireCsrfForGoalCreation() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);

        // Authentication alone is insufficient for POST requests.
        mockMvc.perform(post(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_GOAL_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldCreateGoalForOwnedAssignment() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);

        mockMvc.perform(post(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_GOAL_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.assignmentId")
                        .value(assignment.getId()))
                .andExpect(jsonPath("$.title")
                        .value("Complete 12 sessions"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        // Verify that a goal was actually persisted.
        assertEquals(
                1,
                customerGoalRepository
                        .findByTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
                                assignment.getId(), trainer.getId())
                        .size()
        );
    }

    @Test
    void shouldRejectBlankGoalTitle() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);

        // @NotBlank must reject a whitespace-only title.
        mockMvc.perform(post(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "   ",
                                  "targetSessions": 12
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.title").exists());
    }

    @Test
    void shouldListGoalsForOwnedAssignment() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        createGoal(assignment);

        mockMvc.perform(get(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignment.getId())
                        .with(authentication(trainerAuthentication(trainer))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title")
                        .value("Complete 12 sessions"));
    }

    @Test
    void shouldPreventCreatingGoalForAnotherTrainer()
            throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);

        // Trainer B must not create a goal for Trainer A's assignment.
        mockMvc.perform(post(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignmentA.getId())
                        .with(authentication(trainerAuthentication(trainerB)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_GOAL_JSON))
                .andExpect(status().isNotFound());

        assertTrue(customerGoalRepository
                .findByTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
                        assignmentA.getId(), trainerA.getId())
                .isEmpty());
    }

    @Test
    void shouldPreventListingAnotherTrainersGoals() throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);
        createGoal(assignmentA);

        mockMvc.perform(get(
                        "/api/trainer-customers/{assignmentId}/goals",
                        assignmentA.getId())
                        .with(authentication(trainerAuthentication(trainerB))))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRetrieveOwnedGoal() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        CustomerGoal goal = createGoal(assignment);

        mockMvc.perform(get(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignment.getId(),
                        goal.getId())
                        .with(authentication(trainerAuthentication(trainer))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(goal.getId()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void shouldPreventReadingAnotherTrainersGoal() throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);
        CustomerGoal goalA = createGoal(assignmentA);

        mockMvc.perform(get(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignmentA.getId(),
                        goalA.getId())
                        .with(authentication(trainerAuthentication(trainerB))))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldUpdateGoalDetails() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        CustomerGoal goal = createGoal(assignment);

        mockMvc.perform(put(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignment.getId(),
                        goal.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Complete 20 sessions",
                                  "description": "Updated goal",
                                  "targetDate": "2027-05-01",
                                  "targetSessions": 20
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title")
                        .value("Complete 20 sessions"))
                .andExpect(jsonPath("$.targetSessions").value(20));

        // The updated value must also exist in PostgreSQL.
        assertEquals(
                "Complete 20 sessions",
                customerGoalRepository.findById(goal.getId())
                        .orElseThrow().getTitle()
        );
    }

    @Test
    void shouldChangeGoalStatus() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        CustomerGoal goal = createGoal(assignment);

        mockMvc.perform(patch(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}/status",
                        assignment.getId(),
                        goal.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        assertEquals(
                CustomerGoal.GoalStatus.COMPLETED,
                customerGoalRepository.findById(goal.getId())
                        .orElseThrow().getStatus()
        );
    }

    @Test
    void shouldRejectMissingGoalStatus() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        CustomerGoal goal = createGoal(assignment);

        // @NotNull must reject a missing status field.
        mockMvc.perform(patch(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}/status",
                        assignment.getId(),
                        goal.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.status").exists());
    }

    @Test
    void shouldPreventUpdatingAnotherTrainersGoal() throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);
        CustomerGoal goalA = createGoal(assignmentA);

        mockMvc.perform(put(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignmentA.getId(),
                        goalA.getId())
                        .with(authentication(trainerAuthentication(trainerB)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_GOAL_JSON))
                .andExpect(status().isNotFound());

        assertEquals(
                "Complete 12 sessions",
                customerGoalRepository.findById(goalA.getId())
                        .orElseThrow().getTitle()
        );
    }

    @Test
    void shouldPreventChangingAnotherTrainersGoalStatus()
            throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);
        CustomerGoal goalA = createGoal(assignmentA);

        mockMvc.perform(patch(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}/status",
                        assignmentA.getId(),
                        goalA.getId())
                        .with(authentication(trainerAuthentication(trainerB)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isNotFound());

        assertEquals(
                CustomerGoal.GoalStatus.ACTIVE,
                customerGoalRepository.findById(goalA.getId())
                        .orElseThrow().getStatus()
        );
    }

    @Test
    void shouldDeleteOwnedGoal() throws Exception {
        Trainer trainer = createTrainer();
        TrainerCustomer assignment = createAssignment(trainer);
        CustomerGoal goal = createGoal(assignment);

        mockMvc.perform(delete(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignment.getId(),
                        goal.getId())
                        .with(authentication(trainerAuthentication(trainer)))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        // Confirm deletion from PostgreSQL, not just HTTP 204.
        customerGoalRepository.flush();
        assertFalse(customerGoalRepository.existsById(goal.getId()));
    }

    @Test
    void shouldPreventDeletingAnotherTrainersGoal() throws Exception {
        Trainer trainerA = createTrainer();
        Trainer trainerB = createTrainer();
        TrainerCustomer assignmentA = createAssignment(trainerA);
        CustomerGoal goalA = createGoal(assignmentA);

        mockMvc.perform(delete(
                        "/api/trainer-customers/{assignmentId}/goals/{goalId}",
                        assignmentA.getId(),
                        goalA.getId())
                        .with(authentication(trainerAuthentication(trainerB)))
                        .with(csrf()))
                .andExpect(status().isNotFound());

        assertTrue(customerGoalRepository.existsById(goalA.getId()));
    }
}
