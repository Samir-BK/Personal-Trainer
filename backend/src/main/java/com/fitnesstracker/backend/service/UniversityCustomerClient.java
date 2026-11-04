
package com.fitnesstracker.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class UniversityCustomerClient {

    private static final String UNIVERSITY_API_URL =
            "https://customerrestservice-personaltraining.rahtiapp.fi/api";

    private final RestClient restClient;

    public UniversityCustomerClient() {
        // Spring's RestClient makes HTTP requests to the university API.
        // We only need to verify customer existence, not copy customer data.
        this.restClient = RestClient.builder()
                .baseUrl(UNIVERSITY_API_URL)
                .build();
    }

    public boolean customerExists(Long universityCustomerId) {

        // Reject invalid IDs before making an external HTTP request.
        if (universityCustomerId == null || universityCustomerId <= 0) {
            return false;
        }

        try {
            restClient.get()
                    .uri("/customers/{id}", universityCustomerId)
                    .retrieve()

                    // HTTP 404 means the customer does not exist.
                    // Handle it separately from server errors.
                    .onStatus(
                            status -> status.value() == 404,
                            (request, response) -> {
                                throw new UniversityCustomerNotFoundException();
                            })
                    .toBodilessEntity();

            return true;

        } catch (UniversityCustomerNotFoundException exception) {
            return false;

        } catch (RestClientException exception) {
            // A timeout, connection failure, or upstream server error
            // must not be mistaken for a nonexistent customer.
            throw new IllegalStateException(
                    "Unable to verify customer with university API",
                    exception);
        }
    }

    // Private exception used to distinguish HTTP 404 from other failures.
    private static class UniversityCustomerNotFoundException
            extends RuntimeException {
    }
}
