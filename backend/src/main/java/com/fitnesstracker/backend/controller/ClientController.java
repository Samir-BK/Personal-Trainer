package com.fitnesstracker.backend.controller;


import com.fitnesstracker.backend.service.ClientService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController // Spring uses this class to handle HTTP requests and return response data.
@RequestMapping("/api/clients") // Base URL for all endpoints in this controller.
public class ClientController {

    private final ClientService clientService;

    public  ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

}
