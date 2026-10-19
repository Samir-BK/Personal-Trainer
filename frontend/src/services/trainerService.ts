import axios from "axios"; // JavaScript library that lets your frontend communicate with a backend
import type { Customer, Training } from "../types/trainer";

// Read API base URL from env variables
const API_BASE_URL = import.meta.env.VITE_TRAINER_API

// Create a pre-configured Axios client instance for reuse across all API calls
const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
});
/**
 * Fetches all customers from the HAL REST API endpoint.
 * Extracts the raw customer array from the nested '_embedded' response wrapper.
 */
export const fetchCustomers = async (): Promise<Customer[]> => {
    const response = await client.get("customers");
    // Optional chaining prevents runtime errors if _embedded or customers is undefined
    return response.data._embedded?.customers || []; 
} 

/**
 * Fetches all training sessions.
 * Uses /gettrainings helper endpoint which returns pre-joined customer objects.
 */
export const fetchTrainings = async (): Promise<Training []> => {
    const response = await client.get("trainings");
    return response.data;
}

// Fetch cusotmer's details using the URL supplied by the API

export const fetchCustomersByURL = async (
    url: string
): Promise<Customer> => {
    const response = await axios.get<Customer>(url); 
    return response.data;
}