
package com.fitnesstracker.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fitnesstracker.backend.model.CustomerGoal;

public interface CustomerGoalRepository
        extends JpaRepository<CustomerGoal, Long> {

    // Retrieve goals for a particular assigned customer.
    // Both assignment ID and trainer ID must match.
    // This prevents one trainer from listing another trainer's goals.
    List<CustomerGoal> findByTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
            Long assignmentId,
            Long trainerId
    );

    // Retrieve a single goal only if it belongs to the authenticated trainer.
    // The goal ID alone is insufficient for authorization.
    Optional<CustomerGoal> findByIdAndTrainerCustomer_Trainer_Id(
            Long goalId,
            Long trainerId
    );

    // Retrieve a goal belonging to a particular customer assignment,
    // while also verifying ownership of that assignment.
    // Useful for update and delete operations.
    Optional<CustomerGoal>
            findByIdAndTrainerCustomer_IdAndTrainerCustomer_Trainer_Id(
                    Long goalId,
                    Long assignmentId,
                    Long trainerId
            );
}
