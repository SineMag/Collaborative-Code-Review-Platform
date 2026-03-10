import { config } from "dotenv";
import express from "express";
import { pool } from "./db/pool";
import authRoutes from "./routes/auth";
import commentRoutes from "./routes/comments";
import projectRoutes from "./routes/projects";
import submissionRoutes from "./routes/submissions";
import userRoutes from "./routes/users";

config();

const app = express();

app.use(express.json());

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

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
