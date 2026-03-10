import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user?.id !== id && req.user?.role !== "reviewer") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, display_picture, created_at
        FROM users
        WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to fetch user" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user?.id !== id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { name, email, displayPicture } = req.body as {
    name?: string;
    email?: string;
    displayPicture?: string;
  };

  const fields: string[] = [];
  const values: Array<string> = [];

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ message: "name cannot be empty" });
    }
    fields.push(`name = $${fields.length + 1}`);
    values.push(name);
  }

  if (email !== undefined) {
    if (!email.includes("@")) {
      return res.status(400).json({ message: "email must be valid" });
    }
    fields.push(`email = $${fields.length + 1}`);
    values.push(email);
  }

  if (displayPicture !== undefined) {
    fields.push(`display_picture = $${fields.length + 1}`);
    values.push(displayPicture);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = $${fields.length + 1}
        RETURNING id, name, email, role, display_picture, created_at
      `,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    const message = (error as { code?: string }).code === "23505"
      ? "Email already exists"
      : "Unable to update user";

    return res.status((error as { code?: string }).code === "23505" ? 409 : 500).json({ message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user?.id !== id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Unable to delete user" });
  }
});

export default router;
