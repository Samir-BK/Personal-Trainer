
package com.fitnesstracker.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fitnesstracker.backend.model.TrainerCustomer;

public interface TrainerCustomerRepository
        extends JpaRepository<TrainerCustomer, Long> {

    // Retrieve only the customers assigned to the specified trainer.
    // Spring Data JPA follows the trainer relationship to its id.
    List<TrainerCustomer> findByTrainer_Id(Long trainerId);

    // Check whether a customer is already assigned to this trainer.
    // This allows the service to reject duplicate assignments.
    boolean existsByTrainer_IdAndUniversityCustomerId(
            Long trainerId,
            Long universityCustomerId
    );

    // Retrieve an assignment only when it belongs to the specified trainer.
    // Prevents services from accessing another trainer's assignment by ID.
    Optional<TrainerCustomer> findByIdAndTrainer_Id(
            Long assignmentId,
            Long trainerId
    );

    // Retrieve a specific university customer assigned to a trainer.
    // Useful when creating goals and training notes later.
    Optional<TrainerCustomer> findByTrainer_IdAndUniversityCustomerId(
            Long trainerId,
            Long universityCustomerId
    );
}
