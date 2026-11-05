
import axios from "axios";

// The Spring Boot backend is available through the Vite /api proxy.
// withCredentials includes the authenticated session cookie.
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Matches the safe response DTO returned by Spring Boot.
export interface TrainerCustomerAssignment {
  id: number;
  universityCustomerId: number;
  assignedAt: string;
}

// Spring Security requires a CSRF token for POST and DELETE.
// Fetching /api/csrf ensures the token cookie is available.
async function getCsrfToken(): Promise<string> {
  const response = await api.get<{ token: string }>("/csrf");
  return response.data.token;
}

// Assign a university customer to the currently logged-in trainer.
// The backend gets the trainer ID from the authenticated session.
export async function assignCustomer(
  universityCustomerId: number,
): Promise<TrainerCustomerAssignment> {
  const token = await getCsrfToken();

  const response = await api.post<TrainerCustomerAssignment>(
    "/trainer-customers",
    { universityCustomerId },
    {
      headers: {
        "X-XSRF-TOKEN": token,
      },
    },
  );

  return response.data;
}

// Retrieve only the current trainer's customer assignments.
export async function getAssignedCustomers(): Promise<
  TrainerCustomerAssignment[]
> {
  const response = await api.get<TrainerCustomerAssignment[]>(
    "/trainer-customers",
  );

  return response.data;
}

// Retrieve one assignment, with ownership enforced by the backend.
export async function getAssignment(
  assignmentId: number,
): Promise<TrainerCustomerAssignment> {
  const response = await api.get<TrainerCustomerAssignment>(
    `/trainer-customers/${assignmentId}`,
  );

  return response.data;
}

// Remove an assignment belonging to the logged-in trainer.
export async function removeAssignment(
  assignmentId: number,
): Promise<void> {
  const token = await getCsrfToken();

  await api.delete(`/trainer-customers/${assignmentId}`, {
    headers: {
      "X-XSRF-TOKEN": token,
    },
  });
}
