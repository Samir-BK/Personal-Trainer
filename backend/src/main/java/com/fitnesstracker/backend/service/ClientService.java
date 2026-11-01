package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.repository.ClientRepository;
import org.springframework.stereotype.Service;
import com.fitnesstracker.backend.model.Client;
import java.util.List;

@Service // Registers this class as a Spring-managed service
public class ClientService {

    private final ClientRepository clientRepository;

    // Spring injects the repository when it creates this service.
    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }
    
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }
}