# Collaborative Code Review Platform

API-driven service for posting code snippets, requesting feedback, and collaborating on reviews in real time.

## Sprint 1: Project Setup & Foundations

What is included:
- TypeScript Node.js project structure
- PostgreSQL connection pool
- Initial DB schema (users, projects, submissions, comments)

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
