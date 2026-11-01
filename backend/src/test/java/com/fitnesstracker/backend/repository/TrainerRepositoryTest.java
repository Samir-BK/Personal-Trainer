package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.Trainer;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TrainerRepositoryTest {

    @Autowired
    private TrainerRepository trainerRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void shouldSaveAndFindTrainerByEmail() {

        Trainer trainer = new Trainer(
                "Alex",
                "Smith",
                "alex.trainer@example.com",
                "test-hash-not-a-real-password"
        );

        Trainer savedTrainer = trainerRepository.save(trainer);

        // Write pending changes to PostgreSQL and clear JPA's first-level cache.
        // This ensures the next query retrieves data rather than a cached entity.
        entityManager.flush();
        entityManager.clear();

        Trainer foundTrainer = trainerRepository
                .findByEmail("alex.trainer@example.com")
                .orElseThrow();

        assertNotNull(savedTrainer.getId());
        assertEquals(savedTrainer.getId(), foundTrainer.getId());
        assertEquals("Alex", foundTrainer.getFirstName());
        assertEquals("Smith", foundTrainer.getLastName());
        assertEquals("alex.trainer@example.com", foundTrainer.getEmail());
    }
}