import { config } from "dotenv";
import http from "http";
import express from "express";
import methodOverride from "method-override";
import type { Request, Response } from "express";
import { pool } from "./db/pool";
import authRoutes from "./routes/auth";
import commentRoutes from "./routes/comments";
import projectRoutes from "./routes/projects";
import submissionRoutes from "./routes/submissions";
import userRoutes from "./routes/users";
import { errorHandler, notFound } from "./middleware/error";
import { initWebsocket } from "./realtime";

config();

const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
const allowedMethods = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

function applyCorsHeaders(_req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", allowedMethods);
  res.header("Access-Control-Allow-Headers", allowedHeaders);
}

app.use((req, res, next) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  return next();
});

app.use(express.json());
app.use(methodOverride("_method"));

app.use("/api/auth", authRoutes);
app.use("/api", commentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", submissionRoutes);
app.use("/api/users", userRoutes);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.status(200).json({ status: "ok", db: "up" });
  } catch {
    res.status(200).json({ status: "ok", db: "down" });
  }
});

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

const server = http.createServer(app);
initWebsocket(server);

server.listen(port, () => {
  console.log(`🚀 Collaborative Code Review Platform API Server is running!`);
  console.log(`📍 Server listening on port ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`📚 API Documentation:`);
  console.log(`   - Auth: http://localhost:${port}/api/auth`);
  console.log(`   - Users: http://localhost:${port}/api/users`);
  console.log(`   - Projects: http://localhost:${port}/api/projects`);
  console.log(`   - Submissions: http://localhost:${port}/api/submissions`);
  console.log(`   - Comments: http://localhost:${port}/api/comments`);
});
