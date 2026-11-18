# Personal Trainer Management System

A university full-stack project for personal trainers to manage customer assignments and fitness goals, alongside a shared customer directory and training sessions supplied by the university REST API.

The application uses React and TypeScript, a Spring Boot backend, and PostgreSQL.

## Features

- **Trainer accounts:** registration, session-based login/logout, and a read-only profile. Passwords are hashed with BCrypt; backend mutations require CSRF protection.
- **Dashboard:** assigned customer and active goal counts, university-wide training counts and minutes, and up to five upcoming active goal deadlines.
- **Customers:** browse, sort, filter, add, edit, delete, and export the university customer directory to CSV. Assign customers to your account and manage them on **My Customers**.
- **Fitness goals:** create, edit, delete, and change goals between `ACTIVE`, `COMPLETED`, and `CANCELLED`. Goals support optional descriptions, target dates, and target session counts.
- **Trainings:** browse, create, and delete university training sessions with customer details and date/time selection.
- **Calendar and statistics:** month, week, and day calendar views with session details, plus a bar chart of total training minutes by activity.
- **Interface:** responsive Material UI navigation, data grids, validation feedback, and deletion confirmations.

## Architecture and data ownership

```text
React frontend
    ├── University REST API: shared customers and training sessions
    └── Spring Boot API: accounts, authentication, assignments, goals
          └── PostgreSQL: Flyway-managed schema
```

The frontend accesses the university API separately from the Spring Boot API. The backend also checks university customer existence when creating assignments.

PostgreSQL stores trainer accounts (`trainer`), references to university customers (`trainer_customer`), and assignment-specific goals (`customer_goal`). Customer contact details and training records remain in the university service.

**A local assignment ID is different from a university customer ID.** The route `/my-customers/:assignmentId/goals` uses the local assignment ID. The backend identifies the trainer from the authenticated session and enforces ownership of assignments and goals. Customer and training edits affect the shared university directory, rather than private trainer records.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Material UI, MUI X, Axios, Day.js |
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA, Bean Validation, Maven |
| Database | PostgreSQL 17, Flyway; H2 for automated tests |
| Tooling | Docker Compose, GitHub Actions, ESLint |

## Project structure

```text
backend/
├── src/main/java/       # Controllers, services, security, entities and DTOs
├── src/main/resources/  # Application properties and Flyway migrations
├── src/test/            # Backend tests and test configuration
├── Dockerfile
├── mvnw
└── pom.xml
frontend/
├── src/components/     # Navigation and route protection
├── src/pages/          # Dashboard, accounts, customers, goals and trainings
├── src/services/       # Spring Boot and university API clients
├── src/types/
├── vite.config.ts      # Development proxy
└── vercel.json         # Deployment rewrites
compose.yaml            # PostgreSQL and backend services
```

## Local development

Prerequisites: Docker with Compose, Node.js 22.12 or later in the Node 22 series, and npm. Java 21 is also required if running the backend outside Docker; the Maven wrapper is included.

Run the following from the project root.

### 1. Start PostgreSQL and the backend

Set a local database password in the root `.env` file (ignored by Git):

```dotenv
POSTGRES_PASSWORD=your-local-database-password
```

Then start both services:

```bash
docker compose up -d --build
docker compose ps
```

Compose exposes PostgreSQL at `localhost:5433` (database `trainer_db`, user `trainer`) and the backend at `http://localhost:8080`. Flyway applies schema migrations during backend startup. Database data persists in the `trainer_postgres_data` volume.

### 2. Configure the frontend for local services

**The checked-in Vite `/api` proxy targets the Render backend.** To use the backend started above, change its target in `frontend/vite.config.ts` to:

```ts
target: 'http://localhost:8080',
```

Set the university API URL in `frontend/.env.local`:

```dotenv
VITE_TRAINER_API=https://customer-rest-service-frontend-personaltrainer.2.rahtiapp.fi/api/
```

Keep the trailing slash because the API client uses relative resource paths. Vite exposes `VITE_` variables to the browser; use them only for public configuration.

### 3. Start the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Register an account, sign in, and assign a customer from **Customers**. Open **My Customers** to manage that assignment's goals. Restart Vite after changing environment or proxy settings.

### Alternative: run Spring Boot outside Docker

Start only the database with `docker compose up -d postgres`. Leave the Compose backend stopped so port 8080 is available, then run:

```bash
cd backend
export DB_PASSWORD="your-local-database-password"
./mvnw spring-boot:run
```

`DB_PASSWORD` must match the database's `POSTGRES_PASSWORD`. Compose reads the root `.env` automatically; Spring Boot's Maven launch uses the exported variable. If the Compose backend is already running, stop it with `docker compose stop backend` first.

## API reference

The frontend uses `/api` for Spring Boot requests, with session cookies and CSRF tokens for mutations. Registration creates an account; sign in separately afterward.

| Backend path | Methods and purpose |
| --- | --- |
| `/api/csrf` | `GET` CSRF token |
| `/api/trainers/register` | `POST` register |
| `/api/trainers/login` | `POST` sign in |
| `/api/trainers/logout` | `POST` sign out |
| `/api/trainers/me` | `GET` current trainer |
| `/api/trainer-customers` | `GET` assignments; `POST` assign customer |
| `/api/trainer-customers/{assignmentId}` | `GET` assignment; `DELETE` remove assignment |
| `/api/trainer-customers/{assignmentId}/goals` | `GET` goals; `POST` create goal |
| `/api/trainer-customers/{assignmentId}/goals/{goalId}` | `GET`, `PUT`, `DELETE` goal |
| `/api/trainer-customers/{assignmentId}/goals/{goalId}/status` | `PATCH` goal status |

Request and response shapes are defined in [backend DTOs](backend/src/main/java/com/fitnesstracker/backend/dto) and [frontend services](frontend/src/services).

## Checks

Run backend tests from `backend/`:

```bash
./mvnw test
```

Tests use H2 with Flyway migrations and cover authentication, CSRF, assignments, goals, and trainer ownership. A local PostgreSQL instance is not required by the test configuration.

Run frontend checks from `frontend/`:

```bash
npm run lint
npm run build
```

[GitHub Actions](.github/workflows/ci.yml) runs backend tests and frontend lint/build checks for pushes and pull requests to `main`. The backend CI job also provisions PostgreSQL, though tests are configured to use H2.

## Deployment configuration

[frontend/vercel.json](frontend/vercel.json) configures Vercel to forward `/api/*` to the Render backend and `/university-api/*` to the university service, with an SPA fallback for client routes. For this configuration, set `VITE_TRAINER_API=/university-api/` at frontend build time.

The backend can be built using [backend/Dockerfile](backend/Dockerfile). Supply `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` for its PostgreSQL connection. Hosting availability and database provisioning are managed outside this repository.

## Limitations

- Existing training sessions cannot be edited in the current UI.
- Target session counts are stored as goals; training sessions do not automatically update goal progress or status.
- Training lists, calendar, statistics, and dashboard training totals use the shared university data, rather than filtering to the trainer's assignments.
- Customer and training operations depend on the external university API being available.
