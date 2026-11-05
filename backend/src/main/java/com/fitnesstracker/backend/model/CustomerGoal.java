
package com.fitnesstracker.backend.model;

import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.Generated;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "customer_goal")
public class CustomerGoal {

    // Matches the identity primary key defined in Flyway V5.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Every goal belongs to a trainer-owned customer assignment.
    // LAZY avoids loading assignment details unless needed.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trainer_customer_id", nullable = false)
    private TrainerCustomer trainerCustomer;

    @Column(nullable = false)
    private String title;

    // PostgreSQL TEXT allows longer descriptions than VARCHAR(255).
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_date")
    private LocalDate targetDate;

    // Stored as ACTIVE, COMPLETED, or CANCELLED in PostgreSQL.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoalStatus status;

    @Column(name = "target_sessions")
    private Integer targetSessions;

    // PostgreSQL generates the original creation timestamp.
    // Hibernate retrieves it after the INSERT.
    @Generated
    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private Instant createdAt;

    // The application updates this timestamp when a goal changes.
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CustomerGoal() {
        // Required by JPA.
    }

    public CustomerGoal(
            TrainerCustomer trainerCustomer,
            String title,
            String description,
            LocalDate targetDate,
            Integer targetSessions) {

        this.trainerCustomer = trainerCustomer;
        this.title = title;
        this.description = description;
        this.targetDate = targetDate;
        this.targetSessions = targetSessions;
        this.status = GoalStatus.ACTIVE;
    }

    // Called before the first INSERT.
    @PrePersist
    protected void onCreate() {
        updatedAt = Instant.now();
    }

    // Called before Hibernate updates the goal.
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // Change the goal's editable fields without changing its owner.
    public void updateDetails(
            String title,
            String description,
            LocalDate targetDate,
            Integer targetSessions) {

        this.title = title;
        this.description = description;
        this.targetDate = targetDate;
        this.targetSessions = targetSessions;
    }

    // Update the status while keeping the supported enum values.
    public void changeStatus(GoalStatus status) {
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public TrainerCustomer getTrainerCustomer() {
        return trainerCustomer;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public GoalStatus getStatus() {
        return status;
    }

    public Integer getTargetSessions() {
        return targetSessions;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    // Keep the enum inside this entity for now.
    // This lets us commit the complete model as one file.
    public enum GoalStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED
    }
}
