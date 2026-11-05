# Personal Trainer Management System

A full-stack web application for personal trainers to browse university-provided customer and training data, manage their own customer assignments, and create and track fitness goals.

The project consists of a **Spring Boot backend**, a **React/TypeScript frontend**, and a **PostgreSQL database**. The frontend uses a green fitness-inspired Material UI theme.

## Features

### Trainer accounts and security

- Register a trainer account and sign in with email and password.
- Maintain an authenticated session through Spring Security.
- Protect private frontend routes and backend endpoints.
- Use CSRF protection for state-changing backend requests.
- Log out to end the current session.

### Customer management

- Browse customers retrieved from the university REST API.
- Assign university customers to the signed-in trainer.
- View only the customers assigned to the current trainer on **My Customers**.
- Remove a trainer-customer assignment.
- Keep assignment information in the application's PostgreSQL database rather than copying university customer details.

### Fitness goals

- Create, view, edit, and delete goals for an assigned customer.
- Set a goal title, optional description, target date, and target number of sessions.
- Change a goal's status between **ACTIVE**, **COMPLETED**, and **CANCELLED**.
- Confirm goal deletion through a dialog.
- Enforce trainer ownership of assignments and goals in the backend.

### Training sessions

- Browse training sessions retrieved from the university REST API.
- Display their dates, durations, activities, and associated customer names when available.

> **Scope note:** Target sessions are stored as goal targets; automatic training-progress calculations have not been implemented.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Material UI, MUI Data Grid, Axios, Day.js |
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA, Bean Validation, Maven |
| Database | PostgreSQL 17, Flyway migrations |
| External data | University Personal Trainer REST API (HAL-style customer and training resources) |
| Development and CI | Docker Compose, Git, GitHub Actions |

## Project structure

```text
backend-Project/
├── backend/                  # Spring Boot REST API, business logic and tests
│   ├── src/main/java/       # Controllers, services, repositories, entities and DTOs
│   ├── src/main/resources/  # Application configuration and Flyway migrations
│   ├── src/test/            # Backend tests
│   ├── mvnw                  # Maven wrapper
│   └── pom.xml
├── frontend/                 # React + TypeScript application
│   ├── src/
│   │   ├── components/      # Navigation, logout and route protection
│   │   ├── pages/           # Login, registration, customers, goals, trainings
│   │   ├── services/        # Backend and university API clients
│   │   └── types/           # Shared frontend types
│   ├── package.json
│   └── vite.config.ts
├── compose.yaml              # Local PostgreSQL service
└── README.md                 # This file
```

## Architecture and data flow

```text
React frontend (Vite)
    ├── University REST API
    │     ├── Customer directory
    │     └── Training sessions
    │
    └── Spring Boot backend
          ├── Trainer registration and authentication
          ├── Trainer-customer assignments
          ├── Customer fitness goals
          ├── Spring Security session and CSRF protection
          └── PostgreSQL (Flyway-managed schema)
```

**University customer IDs and local assignment IDs are different.** The university API owns the original customer and training records. PostgreSQL stores trainer accounts, references to assigned university customers, and goals belonging to those assignments. When opening a goal-management route such as `/my-customers/:assignmentId/goals`, `assignmentId` refers to the local `trainer_customer` record, **not** the university customer ID.

The backend determines the trainer from the authenticated session; the frontend does not submit a trainer ID to claim ownership of a resource.

## Prerequisites

Install the following before running the application locally:

- **Java 21**
- **Node.js and npm** compatible with the installed Vite version
- **Docker Desktop** (or Docker Engine with Docker Compose)
- **Git**

The Maven wrapper is included in `backend/`, so a separate Maven installation is not required.

## Local development

Run these commands from the project root unless a different directory is specified. Use separate terminals for the backend and frontend.

### 1. Start PostgreSQL

The local setup uses PostgreSQL 17 with the database `trainer_db` and host port **5433**.

Configure `DB_PASSWORD` to match the password expected by your local Docker Compose and Spring Boot configuration. For example, in a macOS/Linux terminal:

```bash
export DB_PASSWORD="your-local-database-password"
docker compose up -d
```

Check that the database container is running:

```bash
docker compose ps
```

Keep database passwords and other secrets out of Git. If your project uses a local `.env` file, do not commit real credentials.

### 2. Start the Spring Boot backend

In a new terminal, from the root directory:

```bash
cd backend
export DB_PASSWORD="your-local-database-password"
./mvnw spring-boot:run
```

The backend runs on **http://localhost:8080** in the local development setup. Flyway applies database migrations during startup.

### 3. Start the React frontend

In another terminal, from the root directory:

```bash
cd frontend
npm ci
npm run dev
```

Open the local address printed by Vite, normally **http://localhost:5173**.

Register a trainer account, sign in, and use the navigation to open **Customers**, **My Customers**, and **Trainings**. Goals can be managed from a customer assignment on **My Customers**.

### External university API

The application retrieves university-managed customer and training data from:

```text
https://customer-rest-service-frontend-personaltrainer.2.rahtiapp.fi/api
```

An internet connection and an available university service are required for those views. If the service is down, customer or training data may fail to load even while the local backend and database are healthy.

## Authentication and authorization

- Registration creates a trainer account; the trainer signs in separately.
- Login uses a Spring Security session stored in a browser cookie.
- The frontend retrieves a CSRF token before protected state-changing requests through the authentication service.
- Protected React routes improve navigation behavior, but **the backend remains responsible for authorization**.
- Trainer-customer assignments and fitness goals are scoped to the authenticated trainer.
- A trainer cannot access another trainer's assignments or goals by guessing URL IDs.

### Main application routes

| Frontend route | Purpose |
| --- | --- |
| `/login` | Sign in |
| `/register` | Create a trainer account |
| `/customers` | Browse the university customer directory; assign/remove customers |
| `/my-customers` | View customers assigned to the signed-in trainer |
| `/my-customers/:assignmentId/goals` | Manage goals for an owned assignment |
| `/trainings` | Browse university training sessions |

### Backend API overview

| Endpoint | Purpose |
| --- | --- |
| `/api/csrf` | Obtain CSRF token information |
| `/api/trainer-customers` | List or create trainer-customer assignments |
| `/api/trainer-customers/{assignmentId}` | Access or remove an individual assignment |
| `/api/trainer-customers/{assignmentId}/goals` | List or create goals for an assignment |
| `/api/trainer-customers/{assignmentId}/goals/{goalId}` | Access, edit, or delete a goal |

The goal API also supports a status-change operation. See the backend controllers for the exact HTTP methods and request bodies. Authentication endpoints are implemented in the trainer controller and consumed through `frontend/src/services/authService.ts`.

## Database and migrations

Flyway manages the PostgreSQL schema. The current domain includes:

- `trainer`: registered trainer accounts and password hashes.
- `trainer_customer`: the association between a trainer and a university customer ID.
- `customer_goal`: goals attached to a specific trainer-customer assignment.

The schema has evolved through versioned migrations. Do not manually recreate these tables in a running database; use Flyway migrations when changing the schema.

## Testing and quality checks

### Backend

From `backend/`:

```bash
./mvnw test
```

The backend test suite covers authentication, CSRF-protected requests, customer assignments, goal operations, and trainer ownership/isolation.

### Frontend

From `frontend/`:

```bash
npm run lint
npm run build
```

For a manual end-to-end check, start both applications and verify login, customer assignment/removal, goal CRUD and status changes, and training data loading.

### Continuous integration

GitHub Actions runs backend checks with a PostgreSQL service and frontend lint/build checks on repository changes. Review the Actions tab for the latest workflow results.

## Current scope and planned improvements

The application currently includes trainer authentication, a university customer directory, trainer-specific assignments, fitness-goal management, training-session browsing, and a responsive green Material UI design.

The following items are **planned, not yet implemented**:

- CSV export of university customers.
- A training calendar with month, week, and day views.
- Training statistics grouped by activity.
- Cloud deployment of the full application.

Training notes and automatic goal-progress calculations are **not part of the current implementation**.

## Development workflow

Changes are developed incrementally, normally with **one file per commit**. Before committing a frontend change, run lint and build; before committing a backend change, run the relevant Maven tests. Push commits and verify GitHub Actions after changes are integrated.

## Project context

This is a university full-stack development project. The application combines data from the university Personal Trainer REST API with private, trainer-owned records stored in its own backend and PostgreSQL database.
