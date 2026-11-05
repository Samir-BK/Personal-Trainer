
import axios from "axios";

// Customer and Training describe the data returned by the
// university's HAL-based REST API.
import type { Customer, Training } from "../types/trainer";

// The API base URL is configured separately for each environment.
//
// Local development can use the university URL from .env.
// Production uses /university-api/ through the Vercel proxy.
const API_BASE_URL = import.meta.env.VITE_TRAINER_API;

// Fail clearly if the university API URL is missing.
// Without this check, Axios could accidentally request a React page.
if (!API_BASE_URL) {
    throw new Error(
        "VITE_TRAINER_API is missing. Configure the university API URL."
    );
}

// Create a reusable Axios client for university API requests.
// Spring Boot requests use separate services and the /api route.
const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Fetch all university customers.
 *
 * The university REST API wraps its customer collection in
 * _embedded.customers according to the HAL response format.
 *
 * Return an empty array if the collection is legitimately empty.
 * Network or HTTP errors are allowed to propagate to the page,
 * where they can be displayed to the trainer.
 */
export const fetchCustomers = async (): Promise<Customer[]> => {
    const response = await client.get("customers");

    return response.data._embedded?.customers ?? [];
};

/**
 * Fetch all training sessions from the university REST API.
 *
 * Each training includes HAL links to related resources,
 * including the customer associated with the session.
 */
export const fetchTrainings = async (): Promise<Training[]> => {
    const response = await client.get("trainings");

    return response.data._embedded?.trainings ?? [];
};

/**
 * Fetch a customer's details using a HAL customer link.
 *
 * HAL links may contain absolute URLs pointing directly
 * to the university server.
 *
 * Instead of requesting that absolute URL from the browser,
 * extract the customer ID and use our configured Axios client.
 *
 * This ensures production requests go through Vercel's
 * /university-api proxy, avoiding unnecessary CORS issues.
 *
 * The ID also prevents us from sending requests to arbitrary
 * addresses supplied through a HAL link.
 */
export const fetchCustomersByURL = async (
    url: string
): Promise<Customer> => {

    // Parse the HAL link to extract its URL pathname.
    // A valid customer link ends in /customers/{id}.
    const pathname = new URL(url, API_BASE_URL.startsWith("http")
        ? API_BASE_URL
        : window.location.origin).pathname;

    // Extract the numeric university customer ID.
    const match = pathname.match(/\/customers\/(\d+)\/?$/);

    // Reject unexpected HAL links rather than issuing
    // requests to invalid or unrelated API endpoints.
    if (!match) {
        throw new Error("Invalid university customer link.");
    }

    const customerId = match[1];

    // Use the same configured API base URL as the other requests.
    // In production, Vercel forwards this to the university server.
    const response = await client.get<Customer>(
        `customers/${customerId}`
    );

    return response.data;
};
