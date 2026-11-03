# Personal Trainer Management — Backend

Spring Boot REST API for trainer accounts and trainer-specific management features. This backend works alongside the university-provided Customer and Training REST API.

## Technology Stack

- Java 21
- Spring Boot 4
- Spring Security
- Spring Data JPA
- PostgreSQL 17
- Flyway
- Maven
- Docker Compose

## Current Features

- Trainer registration with input validation
- Password hashing using BCrypt
- Trainer login with server-side HTTP sessions
- Current trainer endpoint
- Logout and session invalidation
- CSRF protection for state-changing requests
- PostgreSQL persistence
- Database schema migrations with Flyway
- Service and controller tests

## API Endpoints

| Method | Endpoint                 | Description                    |
|--------|--------------------------|--------------------------------|
| GET    | `/api/csrf`              | Obtain a CSRF token            |
| POST   | `/api/trainers/register` | Register a trainer             |
| POST   | `/api/trainers/login`    | Authenticate a trainer         |
| GET    | `/api/trainers/me`       | Retrieve the authenticated trainer |
| POST   | `/api/trainers/logout`   | End the authenticated session  |

Registration and login are public but require a CSRF token. The current-trainer endpoint requires authentication.

Passwords are stored as BCrypt hashes. Password hashes are not included in API responses.

## Running Locally

### Prerequisites

- Java 21
- Docker and Docker Compose
- Maven wrapper (included in the project)

### Start PostgreSQL

From the repository root:

```bash
docker compose up -d
```

The local PostgreSQL container uses:

- **Database:** `trainer_db`
- **Username:** `trainer`
- **Host:** `127.0.0.1`
- **Port:** `5433`

Set `DB_PASSWORD` in the environment to the password configured for the database. Do not commit credentials.

### Start Spring Boot

From the `backend` directory:

```bash
./mvnw spring-boot:run
```

The API runs locally at:

```text
http://localhost:8080
```

Flyway applies pending database migrations during application startup.

## Testing

From the `backend` directory:

```bash
./mvnw test
```

The integration tests use PostgreSQL. The database must be available with the expected connection settings.

> **Note:** Some existing controller tests may require updates following the introduction of CSRF protection.

## Authentication and Security

Authentication uses Spring Security sessions. The browser stores the session identifier in an HTTP-only cookie.

State-changing requests require a CSRF token. Clients can obtain a token using `GET /api/csrf` and submit it in the `X-XSRF-TOKEN` header.

Authorization for future trainer-owned resources must use the authenticated trainer's identity, never an arbitrary trainer ID supplied by the client.

## University API Integration — Planned

The university REST API provides customers and training sessions. This backend will store trainer-specific relationships and information without duplicating university customer or training records.

Planned features:

- Assign university customers to authenticated trainers
- Create customer-specific fitness goals
- Add private notes to individual university training sessions
- Verify that a referenced training belongs to the assigned customer
- Enforce ownership checks between trainers

University customer and training identifiers will be stored as external references. PostgreSQL cannot enforce foreign keys to the university's database, so reference validation must happen in application logic.

## DevOps Status

**Implemented locally:**

- Docker Compose for PostgreSQL
- Environment-based database configuration
- Flyway schema migrations
- Git version control
- Maven build and test commands

**Planned:**

- GitHub Actions continuous integration
- Docker image for Spring Boot
- Production configuration and secret management
- Public HTTPS deployment
- Health checks and operational monitoring

## Project Structure

```text
backend/
├── src/
│   ├── main/
│   │   ├── java/com/fitnesstracker/backend/
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/
│   └── test/
├── mvnw
└── pom.xml
```

## Development Notes

- Never modify an already-applied Flyway migration. Add a new versioned migration instead.
- Never commit database passwords, session cookies, or local environment files.
- Keep controllers, services, repositories, DTOs, and entities separate.
- Add tests for authorization, validation, and error handling before deployment.