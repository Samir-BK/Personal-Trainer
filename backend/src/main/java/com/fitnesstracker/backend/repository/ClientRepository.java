package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long>{

}
