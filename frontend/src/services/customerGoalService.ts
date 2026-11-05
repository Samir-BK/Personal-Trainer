
import axios from "axios";

// Communicate with Spring Boot through Vite's /api proxy.
// Include the JSESSIONID cookie so Spring Security can identify
// the currently authenticated trainer.
const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// Match the GoalStatus enum defined in CustomerGoal.java.
// These are the only status values accepted by the backend.
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

// Data returned by the CustomerGoalResponse record in Spring Boot.
// Timestamps and dates are represented as strings in JSON.
export interface CustomerGoal {
    id: number;
    assignmentId: number;
    title: string;
    description: string | null;
    targetDate: string | null;
    targetSessions: number | null;
    status: GoalStatus;
    createdAt: string;
    updatedAt: string;
}

// Data React sends when creating or updating a fitness goal.
// Ownership is not part of this object: the backend obtains
// the trainer ID from the authenticated session.
export interface CustomerGoalRequest {
    title: string;
    description?: string | null;
    targetDate?: string | null;
    targetSessions?: number | null;
}

// Fetch a CSRF token before requests that modify backend state.
// Your existing /api/csrf endpoint provides the token.
async function getCsrfToken(): Promise<string> {
    const response = await api.get<{ token: string }>("/csrf");
    return response.data.token;
}

// Create a goal for an assignment belonging to the logged-in trainer.
// The backend verifies assignment ownership before saving the goal.
export async function createCustomerGoal(
    assignmentId: number,
    request: CustomerGoalRequest,
): Promise<CustomerGoal> {
    const token = await getCsrfToken();

    const response = await api.post<CustomerGoal>(
        `/trainer-customers/${assignmentId}/goals`,
        request,
        {
            headers: {
                "X-XSRF-TOKEN": token,
            },
        },
    );

    return response.data;
}

// Retrieve all goals for one assigned customer.
// Spring Boot returns 404 if this assignment belongs to another trainer.
export async function getCustomerGoals(
    assignmentId: number,
): Promise<CustomerGoal[]> {
    const response = await api.get<CustomerGoal[]>(
        `/trainer-customers/${assignmentId}/goals`,
    );

    return response.data;
}

// Retrieve one specific goal with backend ownership verification.
export async function getCustomerGoal(
    assignmentId: number,
    goalId: number,
): Promise<CustomerGoal> {
    const response = await api.get<CustomerGoal>(
        `/trainer-customers/${assignmentId}/goals/${goalId}`,
    );

    return response.data;
}

// Update the editable details of an existing goal.
// The status is intentionally excluded because it has its own endpoint.
export async function updateCustomerGoal(
    assignmentId: number,
    goalId: number,
    request: CustomerGoalRequest,
): Promise<CustomerGoal> {
    const token = await getCsrfToken();

    const response = await api.put<CustomerGoal>(
        `/trainer-customers/${assignmentId}/goals/${goalId}`,
        request,
        {
            headers: {
                "X-XSRF-TOKEN": token,
            },
        },
    );

    return response.data;
}

// Change only a goal's status without replacing the other fields.
export async function changeCustomerGoalStatus(
    assignmentId: number,
    goalId: number,
    status: GoalStatus,
): Promise<CustomerGoal> {
    const token = await getCsrfToken();

    const response = await api.patch<CustomerGoal>(
        `/trainer-customers/${assignmentId}/goals/${goalId}/status`,
        { status },
        {
            headers: {
                "X-XSRF-TOKEN": token,
            },
        },
    );

    return response.data;
}

// Delete an existing goal owned by the logged-in trainer.
// The backend responds with HTTP 204 when deletion succeeds.
export async function deleteCustomerGoal(
    assignmentId: number,
    goalId: number,
): Promise<void> {
    const token = await getCsrfToken();

    await api.delete(
        `/trainer-customers/${assignmentId}/goals/${goalId}`,
        {
            headers: {
                "X-XSRF-TOKEN": token,
            },
        },
    );
}
