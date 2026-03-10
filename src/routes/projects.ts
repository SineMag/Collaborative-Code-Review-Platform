import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { name, description } = req.body as {
    name?: string;
    description?: string;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO projects (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, owner_id, created_at
      `,
      [name, description || null, req.user?.id]
    );

    return res.status(201).json({ project: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to create project" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT p.id, p.name, p.description, p.owner_id, p.created_at
        FROM projects p
        LEFT JOIN project_members pm
          ON pm.project_id = p.id AND pm.user_id = $1
        WHERE p.owner_id = $1 OR pm.user_id = $1
        ORDER BY p.created_at DESC
      `,
      [req.user?.id]
    );

    return res.status(200).json({ projects: result.rows });
  } catch {
    return res.status(500).json({ message: "Unable to list projects" });
  }
});

router.post("/:id/members", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body as { userId?: string };

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const ownerCheck = await pool.query(
      "SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2",
      [id, req.user?.id]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ message: "Only the project owner can add members" });
    }

    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userCheck.rows[0].role !== "reviewer") {
      return res.status(400).json({ message: "Only reviewers can be added as project members" });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO project_members (project_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING project_id, user_id
      `,
      [id, userId]
    );

    if (insertResult.rowCount === 0) {
      return res.status(409).json({ message: "User is already a member" });
    }

    return res.status(201).json({ member: insertResult.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to add member" });
  }
});

router.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  const { id, userId } = req.params;

  try {
    const ownerCheck = await pool.query(
      "SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2",
      [id, req.user?.id]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ message: "Only the project owner can remove members" });
    }

    const result = await pool.query(
      "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Unable to remove member" });
  }
});

export default router;
