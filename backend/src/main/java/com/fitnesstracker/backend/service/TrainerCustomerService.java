
package com.fitnesstracker.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.model.TrainerCustomer;
import com.fitnesstracker.backend.repository.TrainerRepository;
import com.fitnesstracker.backend.repository.TrainerCustomerRepository;

@Service
public class TrainerCustomerService {

    private final TrainerCustomerRepository trainerCustomerRepository;
    private final TrainerRepository trainerRepository;
    private final UniversityCustomerClient universityCustomerClient;

    // Constructor injection makes dependencies explicit and testable.
    public TrainerCustomerService(
            TrainerCustomerRepository trainerCustomerRepository,
            TrainerRepository trainerRepository,
            UniversityCustomerClient universityCustomerClient) {

        this.trainerCustomerRepository = trainerCustomerRepository;
        this.trainerRepository = trainerRepository;
        this.universityCustomerClient = universityCustomerClient;
    }

    @Transactional
    public TrainerCustomer assignCustomer(
            Long trainerId,
            Long universityCustomerId) {

        // The controller must obtain trainerId from the authenticated
        // Spring Security principal, never from the request body.
        Trainer trainer = trainerRepository.findById(trainerId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Trainer not found"));

        // Reject invalid external customer IDs.
        if (universityCustomerId == null || universityCustomerId <= 0) {
            throw new IllegalArgumentException("Invalid university customer ID");
        }

        // Check for duplicates before contacting the university API.
        if (trainerCustomerRepository
                .existsByTrainer_IdAndUniversityCustomerId(
                        trainerId, universityCustomerId)) {

            throw new IllegalStateException(
                    "Customer is already assigned to this trainer");
        }

        // Verify that the customer exists in the university system.
        // Do not save an assignment for a nonexistent customer.
        if (!universityCustomerClient.customerExists(universityCustomerId)) {
            throw new IllegalArgumentException(
                    "University customer not found");
        }

        TrainerCustomer assignment =
                new TrainerCustomer(trainer, universityCustomerId);

        return trainerCustomerRepository.save(assignment);
    }

    @Transactional(readOnly = true)
    public List<TrainerCustomer> getAssignedCustomers(Long trainerId) {

        // Only retrieve assignments belonging to this trainer.
        return trainerCustomerRepository.findByTrainer_Id(trainerId);
    }

    @Transactional(readOnly = true)
    public TrainerCustomer getAssignment(
            Long trainerId,
            Long assignmentId) {

        // An assignment belonging to another trainer is treated
        // exactly like an assignment that does not exist.
        return trainerCustomerRepository
                .findByIdAndTrainer_Id(assignmentId, trainerId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Assignment not found"));
    }

    @Transactional
    public void removeAssignment(
            Long trainerId,
            Long assignmentId) {

        // Verify ownership before deleting anything.
        TrainerCustomer assignment =
                getAssignment(trainerId, assignmentId);

        trainerCustomerRepository.delete(assignment);
    }
}
