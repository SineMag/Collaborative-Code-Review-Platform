import { config } from "dotenv";
import express from "express";
import { pool } from "./db/pool";

config();

const app = express();

app.use(express.json());

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
