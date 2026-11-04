
package com.fitnesstracker.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.model.TrainerCustomer;
import com.fitnesstracker.backend.repository.TrainerRepository;
import com.fitnesstracker.backend.repository.TrainerCustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;

import com.fitnesstracker.backend.exception.TrainerCustomerException;

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

    public TrainerCustomer assignCustomer(
            Long trainerId,
            Long universityCustomerId) {

        // The controller will obtain trainerId from the authenticated
        // Spring Security principal, never from the request body.

        // Validate the external ID before querying the database.
        if (universityCustomerId == null || universityCustomerId <= 0) {
            throw new TrainerCustomerException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid university customer ID");
        }

        // Reject duplicate assignments before making an external API call.
        if (trainerCustomerRepository
                .existsByTrainer_IdAndUniversityCustomerId(
                        trainerId, universityCustomerId)) {

            throw new TrainerCustomerException(
                    HttpStatus.CONFLICT,
                    "Customer is already assigned to this trainer");
        }

        // Verify that the customer exists in the university system.
        // No database transaction is held open during this HTTP request.
        boolean customerExists;

        try {
            customerExists = universityCustomerClient.customerExists(universityCustomerId);
        } catch (IllegalStateException exception) {
            // A university API failure is different from a missing customer.
            throw new TrainerCustomerException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "University customer service is unavailable");
        }

        if (!customerExists) {
            throw new TrainerCustomerException(
                    HttpStatus.NOT_FOUND,
                    "University customer not found");
        }

        // Look up the trainer only after the external customer is verified.
        Trainer trainer = trainerRepository.findById(trainerId)
                .orElseThrow(() -> new TrainerCustomerException(
                        HttpStatus.NOT_FOUND,
                        "Trainer not found"));

        // PostgreSQL enforces the unique (trainer_id, university_customer_id)
        // constraint even if concurrent requests pass the duplicate check.
        TrainerCustomer assignment = new TrainerCustomer(trainer, universityCustomerId);

        // this needed when two request arriving simultaneously
        try {
            // Force Hibernate to execute the INSERT immediately.
            // This allows us to catch PostgreSQL's unique constraint violation
            // here instead of waiting until a later transaction flush.
            return trainerCustomerRepository.saveAndFlush(assignment);

        } catch (DataIntegrityViolationException exception) {

            // The database is the final authority on uniqueness.
            // This handles concurrent requests that passed the earlier
            // existsByTrainer_IdAndUniversityCustomerId() check.
            throw new TrainerCustomerException(
                    HttpStatus.CONFLICT,
                    "Customer is already assigned to this trainer");
        }
    }

    @Transactional(readOnly = true)
    public List<TrainerCustomer> getAssignmentsForTrainer(Long trainerId) {

        // Keep authorization checks in the service so all trainer-scoped
        // reads go through the same validation path.
        if (trainerId == null || trainerId <= 0) {
            throw new TrainerCustomerException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid trainer ID");
        }

        return trainerCustomerRepository.findByTrainer_Id(trainerId);
    }

    @Transactional
    public void removeAssignment(
            Long trainerId,
            Long assignmentId) {

        // Verify ownership before deleting anything.
        TrainerCustomer assignment = getAssignment(trainerId, assignmentId);

        trainerCustomerRepository.delete(assignment);
    }

    @Transactional(readOnly = true)
    public TrainerCustomer getAssignment(
            Long trainerId,
            Long assignmentId) {

        // Scope the lookup to the authenticated trainer.
        // Another trainer's assignment is treated as nonexistent.
        return trainerCustomerRepository
                .findByIdAndTrainer_Id(assignmentId, trainerId)
                .orElseThrow(() -> new TrainerCustomerException(
                        HttpStatus.NOT_FOUND,
                        "Assignment not found"));
    }

}
