# Personal Trainer Management — Frontend

React and TypeScript application for managing personal training customers, training sessions, and trainer-specific features.

The application uses two separate backends:

1. **University REST API:** Customer and training data.
2. **Our Spring Boot REST API:** Trainer accounts, authentication, and planned trainer-specific features.

## Technology Stack

- React 19
- TypeScript
- Vite 8
- Material UI
- MUI Data Grid
- React Router 7
- Axios
- Day.js

## Current Features

- Customer list using the university API
- Training list using the university API
- Trainer registration
- Trainer login
- Trainer logout
- Protected application routes
- CSRF-aware authentication requests
- Navigation between application pages

## Application Routes

| Route        | Description         | Access        |
|--------------|---------------------|---------------|
| `/login`     | Trainer login       | Public        |
| `/register`  | Trainer registration | Public       |
| `/`          | Customer list       | Authenticated |
| `/customers` | Customer list       | Authenticated |
| `/trainings` | Training list       | Authenticated |

React route protection checks the trainer's session through the Spring Boot `/api/trainers/me` endpoint.

Actual backend authorization is enforced by Spring Security.

## Running Locally

### Prerequisites

- Node.js compatible with Vite 8
- npm
- Running Spring Boot backend for authentication
- Access to the university REST API

### Start the app

From the `frontend` directory:

```bash
npm install
npm run dev
```

Open the URL displayed by Vite, normally:

```text
http://localhost:5173
```

## Available Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

`npm run build` runs TypeScript checks and creates a production build in `dist/`.

## API Integration

### Spring Boot API

Authentication requests use relative `/api` URLs.

During local development, the Vite proxy forwards these requests to:

```text
http://localhost:8080
```

The frontend retrieves CSRF tokens before authentication-related POST requests. Session cookies are handled by the browser rather than stored in localStorage.

### University REST API

Customer and training records come from:

```text
https://customerrestservice-personaltraining.rahtiapp.fi/api
```

The API returns HAL-style JSON containing `_embedded` collections and `_links` for related resources.

The university API remains the source of truth for customer details and training sessions.

## Planned Features

- Customer create, edit, and delete functionality using the university API
- Training create, edit, and delete functionality using the university API
- Trainer–customer assignment interface
- Customer fitness goals
- Individual training session notes
- Customer progress and training statistics

The assignment, goal, and note features will communicate with our Spring Boot backend.

## Project Structure

```text
src/
├── components/
│   ├── LogoutButton.tsx
│   ├── NavigationActions.tsx
│   └── ProtectedRoute.tsx
├── pages/
│   ├── CustomerList.tsx
│   ├── TrainingList.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── services/
│   ├── authService.ts
│   └── trainerService.ts
├── types/
├── App.tsx
└── main.tsx
```

## Security Notes

- The frontend never stores trainer passwords or session IDs in localStorage.
- Authentication uses server-side sessions.
- State-changing requests to Spring Boot require CSRF protection.
- React route guards improve navigation but do not replace backend authorization.
- Trainer-specific records must be restricted to the authenticated trainer.

## DevOps Status

**Currently available:**

- npm production build
- ESLint command
- Local Vite development server
- Development proxy for Spring Boot
- Git version control

**Planned:**

- GitHub Actions build and lint checks
- Production hosting configuration
- HTTPS
- Production API routing
- Deployment verification

> **Note:** The Vite development proxy does not automatically apply to production hosting.