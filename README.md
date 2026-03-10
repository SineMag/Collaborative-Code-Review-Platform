<img src="https://socialify.git.ci/SineMag/Collaborative-Code-Review-Platform/image?language=1&owner=1&name=1&stargazers=1&theme=Light" alt="Collaborative-Code-Review-Platform" width="640" height="320" />

# Collaborative Code Review Platform


API-driven service for posting code snippets, requesting feedback, and collaborating on reviews in real time.

## Sprint 1: Project Setup & Foundations

What is included:
- TypeScript Node.js project structure
- PostgreSQL connection pool
- Initial DB schema (users, projects, submissions, comments)

## Sprint 2: Authentication & Users

Endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/:id` (auth required, self or reviewer)
- `PATCH /api/users/:id` (auth required, self)
- `DELETE /api/users/:id` (auth required, self)

## Sprint 3: Projects

Endpoints:
- `POST /api/projects`
- `GET /api/projects`
- `POST /api/projects/:id/members`
- `DELETE /api/projects/:id/members/:userId`

## Sprint 4: Code Submissions

Endpoints:
- `POST /api/submissions`
- `GET /api/projects/:id/submissions`
- `GET /api/submissions/:id`
- `PATCH /api/submissions/:id/status`
- `DELETE /api/submissions/:id`

## Sprint 5: Comments

Endpoints:
- `POST /api/submissions/:id/comments` (reviewers only)
- `GET /api/submissions/:id/comments`
- `PATCH /api/comments/:id` (reviewers only)
- `DELETE /api/comments/:id` (reviewers only)

## Sprint 6: Review Workflow

Endpoints:
- `POST /api/submissions/:id/approve` (reviewers only)
- `POST /api/submissions/:id/request-changes` (reviewers only)
- `GET /api/submissions/:id/reviews`

## Sprint 7: Notifications & Stats

Endpoints:
- `GET /api/users/:id/notifications`
- `GET /api/projects/:id/stats`

WebSocket:
- Connect to `ws://localhost:3000/ws` for live notification events.

## Sprint 8: Middleware & Testing

Included:
- Error handling middleware
- Validation middleware for required fields

## Getting Started

1. Install dependencies:
   - `npm install`
2. Create a PostgreSQL database named `code_review` (or update `.env`)
3. Apply the schema:
   - `psql -d code_review -f src/db/schema.sql`
4. Run the server:
   - `npm run dev`

Health check:
- `GET /health`

## Environment

Copy `.env.example` to `.env` and adjust values as needed.
