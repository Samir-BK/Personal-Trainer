package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.Trainer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TrainerRepository extends JpaRepository<Trainer, Long> {

    // Spring Data JPA derives the database query from the method name.
    Optional<Trainer> findByEmail(String email);
}