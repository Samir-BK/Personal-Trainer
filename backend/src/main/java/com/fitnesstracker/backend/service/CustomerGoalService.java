
package com.fitnesstracker.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnesstracker.backend.dto.CustomerGoalRequest;
import com.fitnesstracker.backend.dto.CustomerGoalResponse;
import com.fitnesstracker.backend.exception.TrainerCustomerException;
import com.fitnesstracker.backend.model.CustomerGoal;
import com.fitnesstracker.backend.model.CustomerGoal.GoalStatus;
import com.fitnesstracker.backend.model.TrainerCustomer;
import com.fitnesstracker.backend.repository.CustomerGoalRepository;
import com.fitnesstracker.backend.repository.TrainerCustomerRepository;

@Service
public class CustomerGoalService {

    private final CustomerGoalRepository customerGoalRepository;
    private final TrainerCustomerRepository trainerCustomerRepository;

    // Constructor injection makes dependencies explicit and testable.
    public CustomerGoalService(
            CustomerGoalRepository customerGoalRepository,
            TrainerCustomerRepository trainerCustomerRepository) {

        this.customerGoalRepository = customerGoalRepository;
        this.trainerCustomerRepository = trainerCustomerRepository;
    }

    // Create a new goal for a customer assigned to the logged-in trainer.
    @Transactional
    public CustomerGoalResponse createGoal(
            Long trainerId,
            Long assignmentId,
            CustomerGoalRequest request) {

        // Verify that the assignment belongs to this trainer.
        // Looking up the assignment by ID alone would not be secure.
        TrainerCustomer assignment = getOwnedAssignment(
                trainerId, assignmentId);

        CustomerGoal goal = new CustomerGoal(
                assignment,
                request.title(),
                request.description(),
                request.targetDate(),
                request.targetSessions());

        // Save the goal and retrieve database-generated fields.
        CustomerGoal savedGoal = customerGoalRepository.saveAndFlush(goal);

        return CustomerGoalResponse.fromEntity(savedGoal);
    }

    // List goals belonging to one of the trainer's assigned customers.
    @Transactional(readOnly = true)
    public List<CustomerGoalResponse> getGoals(
            Long trainerId,
            Long assignmentId) {

        // Return 404 if the assignment belongs to someone else.
        getOwnedAssignment(trainerId, assignmentId);

        return customerGoalRepository
                .findByTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
                        assignmentId, trainerId)
                .stream()
                .map(CustomerGoalResponse::fromEntity)
                .toList();
    }

    // Retrieve one goal only if the authenticated trainer owns it.
    @Transactional(readOnly = true)
    public CustomerGoalResponse getGoal(
            Long trainerId,
            Long assignmentId,
            Long goalId) {

        CustomerGoal goal = getOwnedGoal(
                trainerId, assignmentId, goalId);

        return CustomerGoalResponse.fromEntity(goal);
    }

    // Update a goal's editable details without changing its ownership.
    @Transactional
    public CustomerGoalResponse updateGoal(
            Long trainerId,
            Long assignmentId,
            Long goalId,
            CustomerGoalRequest request) {

        CustomerGoal goal = getOwnedGoal(
                trainerId, assignmentId, goalId);

        goal.updateDetails(
                request.title(),
                request.description(),
                request.targetDate(),
                request.targetSessions());

        // Flush so Hibernate executes the UPDATE and @PreUpdate.
        customerGoalRepository.flush();

        return CustomerGoalResponse.fromEntity(goal);
    }

    // Change goal status without modifying its title or target.
    @Transactional
    public CustomerGoalResponse changeGoalStatus(
            Long trainerId,
            Long assignmentId,
            Long goalId,
            GoalStatus status) {

        CustomerGoal goal = getOwnedGoal(
                trainerId, assignmentId, goalId);

        goal.changeStatus(status);

        // Flush to update the modification timestamp.
        customerGoalRepository.flush();

        return CustomerGoalResponse.fromEntity(goal);
    }

    // Delete a goal only when the authenticated trainer owns it.
    @Transactional
    public void deleteGoal(
            Long trainerId,
            Long assignmentId,
            Long goalId) {

        CustomerGoal goal = getOwnedGoal(
                trainerId, assignmentId, goalId);

        customerGoalRepository.delete(goal);
    }

    // Centralized ownership check for trainer-customer assignments.
    private TrainerCustomer getOwnedAssignment(
            Long trainerId,
            Long assignmentId) {

        return trainerCustomerRepository
                .findByIdAndTrainer_Id(assignmentId, trainerId)
                .orElseThrow(() -> new TrainerCustomerException(
                        HttpStatus.NOT_FOUND,
                        "Customer assignment not found"));
    }

    // Centralized ownership check for individual goals.
    // A goal must match its ID, assignment ID, and trainer ID.
    private CustomerGoal getOwnedGoal(
            Long trainerId,
            Long assignmentId,
            Long goalId) {

        return customerGoalRepository
                .findByIdAndTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
                        goalId, assignmentId, trainerId)
                .orElseThrow(() -> new TrainerCustomerException(
                        HttpStatus.NOT_FOUND,
                        "Customer goal not found"));
    }
}
