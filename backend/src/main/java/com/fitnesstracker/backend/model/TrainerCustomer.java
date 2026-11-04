
package com.fitnesstracker.backend.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "trainer_customer",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_trainer_customer",
                columnNames = {"trainer_id", "university_customer_id"}
        )
)
public class TrainerCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Each assignment belongs to one trainer in our database.
    // LAZY prevents unnecessary trainer queries when loading assignments.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trainer_id", nullable = false)
    private Trainer trainer;

    // Customer IDs come from the university REST API.
    // We store only the external ID, not a local Customer entity.
    @Column(name = "university_customer_id", nullable = false)
    private Long universityCustomerId;

    // PostgreSQL sets this value using DEFAULT CURRENT_TIMESTAMP.
    // The application reads it but does not insert or update it.
    @Column(
            name = "assigned_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private Instant assignedAt;

    protected TrainerCustomer() {
        // Required by JPA.
    }

    public TrainerCustomer(Trainer trainer, Long universityCustomerId) {
        this.trainer = trainer;
        this.universityCustomerId = universityCustomerId;
    }

    public Long getId() {
        return id;
    }

    public Trainer getTrainer() {
        return trainer;
    }

    public Long getUniversityCustomerId() {
        return universityCustomerId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
