package com.fitnesstracker.backend.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Provides the CSRF token needed by the React frontend
// when submitting requests that change server-side state.
@RestController
public class CsrfController {
    // A GET request does not require a CSRF token.
    // Spring Security supplies the current token as a method argument.
    //
    // Accessing getToken() ensures a token is generated and available
    // for the frontend to send with subsequent POST requests.
    @GetMapping("/api/csrf")
    public CsrfToken getCsrfToken(CsrfToken csrfToken) {
        return csrfToken;
    }
}
