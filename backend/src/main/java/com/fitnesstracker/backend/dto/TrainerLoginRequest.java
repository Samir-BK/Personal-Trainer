package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TrainerLoginRequest (

    @NotBlank(message = "Email is required")
    @Email (message = "Email must be valid")
    String email,

    @NotBlank (message= "Password is required")
    String password

){

}
