import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth, requireReviewer } from "../middleware/auth";

const router = Router();

async function getSubmissionContext(submissionId: string, userId: string) {
  const result = await pool.query(
    `
      SELECT s.id,
             s.project_id,
             s.author_id,
             p.owner_id,
             pm.user_id AS member_id
      FROM submissions s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN project_members pm
        ON pm.project_id = p.id AND pm.user_id = $2
      WHERE s.id = $1
    `,
    [submissionId, userId]
  );

  return result.rows[0] as {
    id: string;
    project_id: string;
    author_id: string;
    owner_id: string;
    member_id: string | null;
  } | undefined;
}

router.post("/submissions/:id/comments", requireAuth, requireReviewer, async (req, res) => {
  const { id } = req.params;
  const { body, lineNumber } = req.body as {
    body?: string;
    lineNumber?: number;
  };

  if (!body || !body.trim()) {
    return res.status(400).json({ message: "body is required" });
  }

  if (lineNumber !== undefined && (!Number.isInteger(lineNumber) || lineNumber < 1)) {
    return res.status(400).json({ message: "lineNumber must be a positive integer" });
  }

  try {
    const context = await getSubmissionContext(id, req.user?.id as string);

    if (!context) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const allowed = context.owner_id === req.user?.id || Boolean(context.member_id);

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `
        INSERT INTO comments (submission_id, author_id, line_number, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id, submission_id, author_id, line_number, body, created_at
      `,
      [id, req.user?.id, lineNumber || null, body]
    );

    return res.status(201).json({ comment: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to add comment" });
  }
});

router.get("/submissions/:id/comments", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id as string;

  try {
    const context = await getSubmissionContext(id, userId);

    if (!context) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const allowed = context.owner_id === userId
      || Boolean(context.member_id)
      || context.author_id === userId;

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `
        SELECT id, submission_id, author_id, line_number, body, created_at
        FROM comments
        WHERE submission_id = $1
        ORDER BY created_at ASC
      `,
      [id]
    );

    return res.status(200).json({ comments: result.rows });
  } catch {
    return res.status(500).json({ message: "Unable to list comments" });
  }
});

router.patch("/comments/:id", requireAuth, requireReviewer, async (req, res) => {
  const { id } = req.params;
  const { body, lineNumber } = req.body as {
    body?: string;
    lineNumber?: number;
  };

  if (body !== undefined && !body.trim()) {
    return res.status(400).json({ message: "body cannot be empty" });
  }

  if (lineNumber !== undefined && (!Number.isInteger(lineNumber) || lineNumber < 1)) {
    return res.status(400).json({ message: "lineNumber must be a positive integer" });
  }

  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (body !== undefined) {
    fields.push(`body = $${fields.length + 1}`);
    values.push(body);
  }

  if (lineNumber !== undefined) {
    fields.push(`line_number = $${fields.length + 1}`);
    values.push(lineNumber);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    const authorCheck = await pool.query(
      "SELECT author_id FROM comments WHERE id = $1",
      [id]
    );

    if (authorCheck.rowCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (authorCheck.rows[0].author_id !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `
        UPDATE comments
        SET ${fields.join(", ")}
        WHERE id = $${fields.length + 1}
        RETURNING id, submission_id, author_id, line_number, body, created_at
      `,
      [...values, id]
    );

    return res.status(200).json({ comment: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to update comment" });
  }
});

router.delete("/comments/:id", requireAuth, requireReviewer, async (req, res) => {
  const { id } = req.params;

  try {
    const authorCheck = await pool.query(
      "SELECT author_id FROM comments WHERE id = $1",
      [id]
    );

    if (authorCheck.rowCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (authorCheck.rows[0].author_id !== req.user?.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await pool.query("DELETE FROM comments WHERE id = $1", [id]);

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Unable to delete comment" });
  }
});

export default router;
