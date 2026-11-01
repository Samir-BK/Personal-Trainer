package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.Client;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;


@SpringBootTest
@Transactional
class ClientRepositoryTest {

    @Autowired
    private ClientRepository clientRepository;

    @Test
    void shouldSaveAndFindClient() {
        Client client = new Client("Samir", "B K", "sam123@gmail.com");
        
        Client savedClient = clientRepository.save(client);

        assertNotNull(savedClient.getId());

        Client foundClient = clientRepository.findById(savedClient.getId())
                .orElseThrow();
        assertEquals("Samir", foundClient.getFirstName());
        assertEquals("B K", foundClient.getLastName());
        assertEquals("sam123@gmail.com", foundClient.getEmail());
    }

}   
