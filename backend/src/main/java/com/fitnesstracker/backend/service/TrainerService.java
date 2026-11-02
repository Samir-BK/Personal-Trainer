package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.TrainerRegistrationRequest;
import com.fitnesstracker.backend.dto.TrainerResponse;
import com.fitnesstracker.backend.dto.TrainerLoginRequest;
import com.fitnesstracker.backend.model.Trainer;
import com.fitnesstracker.backend.repository.TrainerRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.fitnesstracker.backend.exception.DuplicateEmailException;
import com.fitnesstracker.backend.exception.InvalidCredentialsException;

@Service // Registers this class as a Spring-managed service.
public class TrainerService {

    private final TrainerRepository trainerRepository;
    private final PasswordEncoder passwordEncoder;

    // Constructor injection:
    // Spring provides the repository and password encoder automatically.
    public TrainerService(
            TrainerRepository trainerRepository,
            PasswordEncoder passwordEncoder) {
        this.trainerRepository = trainerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public TrainerResponse registerTrainer(TrainerRegistrationRequest request) {

        // Prevent registration when an account already uses this email.
        if (trainerRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateEmailException("Email already registered");
        }

        // Hash the password before storing it.
        // Never save the plain-text password in PostgreSQL.
        String hashedPassword = passwordEncoder.encode(request.password());

        Trainer trainer = new Trainer(
                request.firstName(),
                request.lastName(),
                request.email(),
                hashedPassword);

        // JpaRepository saves the new trainer to PostgreSQL.
        Trainer savedTrainer = trainerRepository.save(trainer);

        // Return only safe information; never expose the password hash.
        return new TrainerResponse(
                savedTrainer.getId(),
                savedTrainer.getFirstName(),
                savedTrainer.getLastName(),
                savedTrainer.getEmail());
    }
    public TrainerResponse loginTrainer(TrainerLoginRequest request) {

    // Find the trainer by email.
    // If the email does not exist, return the same generic error
    // we would use for an incorrect password.
    Trainer trainer = trainerRepository.findByEmail(request.email())
            .orElseThrow(() ->
                    new InvalidCredentialsException("Invalid email or password")
            );

    // BCrypt hashes cannot be decrypted.
    // matches() checks whether the submitted password corresponds
    // to the stored hash without exposing the original password.
    boolean passwordMatches = passwordEncoder.matches(
            request.password(),
            trainer.getPasswordHash()
    );

    if (!passwordMatches) {
        throw new InvalidCredentialsException("Invalid email or password");
    }

    // Return only public trainer information.
    // Never return the password or its BCrypt hash.
    return new TrainerResponse(
            trainer.getId(),
            trainer.getFirstName(),
            trainer.getLastName(),
            trainer.getEmail()
    );
}
}