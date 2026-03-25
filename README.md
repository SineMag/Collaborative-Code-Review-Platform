<img src="https://socialify.git.ci/SineMag/Collaborative-Code-Review-Platform/image?language=1&owner=1&name=1&stargazers=1&theme=Light" alt="Collaborative-Code-Review-Platform" width="640" height="320" />

# Collaborative Code Review Platform


API-driven service for posting code snippets, requesting feedback, and collaborating on reviews in real time.

## Prerequisites
- Node.js 20+
- npm 9+
- PostgreSQL 14+

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

## Quickstart (Clone and Run)

1. Clone and install:
   - `git clone https://github.com/SineMag/Collaborative-Code-Review-Platform.git`
   - `cd Collaborative-Code-Review-Platform`
   - `npm install`
2. Configure environment:
   - Copy `STEPS.md` to your own `.env` file
   - Set `JWT_SECRET` to a strong value
   - Update PostgreSQL credentials if needed
3. Create the database and apply schema:
   - `createdb code_review`
   - `psql -d code_review -f src/db/schema.sql`
4. Run the API:
   - `npm run dev`

Health check:
- `GET /health`

WebSocket:
- Connect to `ws://localhost:3000/ws` for live notification events.

## Testing with example users

The following quick examples use curl to register two fake users, log them in, and demonstrate using the returned JWT to call a protected endpoint. These are intended for local testing only.

Example (Mock) users:
- Alice Submitter (submitter)
  - name: "Alice Submitter"
  - email: "alice@example.com"
  - password: "Passw0rd!"
- Bob Reviewer (reviewer)
  - name: "Bob Reviewer"
  - email: "bob@example.com"
  - password: "StrongP@ss1"

1) Register the users

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Submitter","email":"alice@example.com","password":"Passw0rd!"}'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob Reviewer","email":"bob@example.com","password":"StrongP@ss1","role":"reviewer"}'
```

2) Login and capture the token (uses jq to parse JSON; install jq or parse manually)

```bash
# Login Alice
ALICE_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}')
ALICE_TOKEN=$(echo "$ALICE_LOGIN_RESPONSE" | jq -r .token)
ALICE_ID=$(echo "$ALICE_LOGIN_RESPONSE" | jq -r .user.id)

# Login Bob
BOB_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"StrongP@ss1"}')
BOB_TOKEN=$(echo "$BOB_LOGIN_RESPONSE" | jq -r .token)
BOB_ID=$(echo "$BOB_LOGIN_RESPONSE" | jq -r .user.id)
```

3) Call a protected endpoint with the token

```bash
# Get Alice's user record (replace with the actual user id returned above)
curl -H "Authorization: Bearer $ALICE_TOKEN" \
  http://localhost:3000/api/users/$ALICE_ID

# Example: create a project as Alice (requires auth)
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"name":"Test Project","description":"Example project"}'
```

Notes:
- If you don't have jq, you can copy the token and user id from the raw JSON responses.
- The role field when registering is optional; omitting it defaults to "submitter".
- Use distinct emails when re-running register to avoid unique constraint errors (409 Email already exists).

## Environment

Required variables:
- `JWT_SECRET`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (or `DATABASE_URL`)

Optional variables:
- `PORT` (defaults to `3000`)
- `JWT_EXPIRES_IN` (defaults to `1d`)

## Auth Notes

Authenticated requests require:
- `Authorization: Bearer <JWT>`

```bash

DB_USER=postgres
DB_PASSWORD=Malinga@911
DB_HOST=localhost
DB_DATABASE=collaboration_app
DB_PORT=5432
APP_PORT=3000
JWT_SECRET=cb6b93d0670584b11f432304ed61ad3b49e17261b9d74d070b9e73a9c233ec10f35a151f20
012acfac1b30a0722729edd7af10af1ac59c5bf86efaa4f1364fedu
```




# Table for the PostgreSQL 
```sql
-- Initial schema for Sprint 1
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop types if re-running (safe reset)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;

-- Enums
CREATE TYPE user_role AS ENUM ('reviewer', 'submitter');

CREATE TYPE submission_status AS ENUM (
  'pending',
  'in_review',
  'approved',
  'changes_requested'
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'submitter',
  display_picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status submission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_number INTEGER,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status submission_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_submission_id ON comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
```