
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

    // Convert the absolute HAL link into a URL object.
    // The university API should return an HTTP or HTTPS link.
    const parsedUrl = new URL(url);

    // Reject unsupported URL protocols.
    if (
        parsedUrl.protocol !== "https:" &&
        parsedUrl.protocol !== "http:"
    ) {
        throw new Error("Unsupported university customer URL.");
    }

    // Extract the resource path after the university /api/ prefix.
    // This preserves the actual HAL relationship endpoint.
    const apiPathIndex = parsedUrl.pathname.indexOf("/api/");

    if (apiPathIndex === -1) {
        throw new Error("Invalid university API link.");
    }

    const resourcePath = parsedUrl.pathname.substring(
        apiPathIndex + "/api/".length
    );

    // Accept only the customer-related URL structures expected
    // from the university training service.
    // This avoids forwarding unrelated or unexpected resources.
    const isDirectCustomer =
        /^customers\/\d+\/?$/.test(resourcePath);

    const isTrainingCustomer =
        /^trainings\/\d+\/customer\/?$/.test(resourcePath);

    if (!isDirectCustomer && !isTrainingCustomer) {
        throw new Error(
            `Unexpected university customer resource: ${resourcePath}`
        );
    }

    // Use the configured university API client.
    // Locally:
    // VITE_TRAINER_API points to the university API.
    // On Vercel:
    // VITE_TRAINER_API=/university-api/
    // The browser never needs to request the absolute HAL URL.
    const response = await client.get<Customer>(resourcePath);

    // Return the customer information to TrainingList.tsx.
    return response.data;
};


/**
 * Data required to create a new customer in the university REST API.
 *
 * The customer ID and HAL links are not included because the
 * university service generates these when saving a customer.
 *
 * This type is also reused by the customer form in CustomerList.tsx.
 */
export type CustomerRequest = {
    firstname: string;
    lastname: string;
    streetaddress: string;
    postcode: string;
    city: string;
    email: string;
    phone: string;
};

/**
 * Create a new university customer.
 *
 * POST /customers
 *
 * The request uses the existing university Axios client.
 * In production, Vercel forwards the request through
 * /university-api/ to the university REST service.
 *
 * This does not create a trainer-specific assignment.
 * Assignments are managed separately by Spring Boot.
 *
 * Errors are propagated so the page can show feedback.
 */
export const createCustomer = async (
    customer: CustomerRequest
): Promise<Customer> => {

    // Submit customer details to the university REST API.
    const response = await client.post<Customer>(
        "customers",
        customer
    );

    // Return the newly created customer to the calling component.
    return response.data;
};


/**
 * Update an existing customer in the university REST API.
 *
 * The customer ID comes from the university customer's HAL self-link,
 * not from our Spring Boot trainer_customer assignment table.
 *
 * PUT /customers/{id} sends the updated customer details.
 *
 * This operation changes the university customer record.
 * It does not change trainer-specific customer assignments.
 *
 * The university API client uses Vercel's /university-api proxy
 * in production, so the same function works after deployment.
 *
 * HTTP errors are propagated to the calling page so that
 * CustomerList can display appropriate feedback.
 */
export const updateCustomer = async (
    customerId: number,
    customer: CustomerRequest
): Promise<void> => {

    // Reject invalid IDs before sending an HTTP request.
    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
        throw new Error("Invalid university customer ID.");
    }

    // Send the updated customer fields to the university service.
    // Do not include HAL links or our internal assignment ID.
    await client.put(
        `customers/${customerId}`,
        customer
    );
};

    /**
     * Permanently delete a customer from the university REST API.
     *
     * DELETE /customers/{id}
     */

export const deleteCustomer = async (
    customerId: number
): Promise<void> => {

    // Reject missing, negative, or otherwise invalid customer IDs.
    // This prevents accidental requests to unexpected API paths.
    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
        throw new Error("Invalid university customer ID.");
    }

    // Delete the customer using the existing Axios client.
    //
    // Locally, requests use the configured university API URL.
    // On Vercel, requests go through the /university-api proxy.
    await client.delete(`customers/${customerId}`);
};

