import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth, requireReviewer } from "../middleware/auth";

const router = Router();

const allowedStatuses = new Set([
  "pending",
  "in_review",
  "approved",
  "changes_requested"
]);

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

async function getProjectAccess(projectId: string, userId: string) {
  const result = await pool.query(
    `
      SELECT p.id, p.owner_id, pm.user_id AS member_id
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1
    `,
    [projectId, userId]
  );

  return result.rows[0] as {
    id: string;
    owner_id: string;
    member_id: string | null;
  } | undefined;
}

router.post("/submissions", requireAuth, async (req, res) => {
  const { projectId, title, content } = req.body as {
    projectId?: string;
    title?: string;
    content?: string;
  };

  if (!projectId || !title || !content) {
    return res.status(400).json({ message: "projectId, title, and content are required" });
  }

  if (!title.trim() || !content.trim()) {
    return res.status(400).json({ message: "title and content cannot be empty" });
  }

  try {
    const project = await pool.query("SELECT id FROM projects WHERE id = $1", [projectId]);

    if (project.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const result = await pool.query(
      `
        INSERT INTO submissions (project_id, author_id, title, content)
        VALUES ($1, $2, $3, $4)
        RETURNING id, project_id, author_id, title, content, status, created_at
      `,
      [projectId, req.user?.id, title, content]
    );

    return res.status(201).json({ submission: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to create submission" });
  }
});

router.get("/projects/:id/submissions", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id as string;

  try {
    const access = await getProjectAccess(id, userId);

    if (!access) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = access.owner_id === userId;
    const isMember = Boolean(access.member_id);

    if (isOwner || isMember) {
      const result = await pool.query(
        `
          SELECT id, project_id, author_id, title, content, status, created_at
          FROM submissions
          WHERE project_id = $1
          ORDER BY created_at DESC
        `,
        [id]
      );

      return res.status(200).json({ submissions: result.rows });
    }

    const ownSubmissions = await pool.query(
      `
        SELECT id, project_id, author_id, title, content, status, created_at
        FROM submissions
        WHERE project_id = $1 AND author_id = $2
        ORDER BY created_at DESC
      `,
      [id, userId]
    );

    if (ownSubmissions.rowCount === 0) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ submissions: ownSubmissions.rows });
  } catch {
    return res.status(500).json({ message: "Unable to list submissions" });
  }
});

router.get("/submissions/:id", requireAuth, async (req, res) => {
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
        SELECT id, project_id, author_id, title, content, status, created_at
        FROM submissions
        WHERE id = $1
      `,
      [id]
    );

    return res.status(200).json({ submission: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to fetch submission" });
  }
});

router.patch("/submissions/:id/status", requireAuth, requireReviewer, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  const userId = req.user?.id as string;

  if (!status || !allowedStatuses.has(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const context = await getSubmissionContext(id, userId);

    if (!context) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const allowed = context.owner_id === userId || Boolean(context.member_id);

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `
        UPDATE submissions
        SET status = $1
        WHERE id = $2
        RETURNING id, project_id, author_id, title, content, status, created_at
      `,
      [status, id]
    );

    return res.status(200).json({ submission: result.rows[0] });
  } catch {
    return res.status(500).json({ message: "Unable to update status" });
  }
});

router.delete("/submissions/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id as string;

  try {
    const context = await getSubmissionContext(id, userId);

    if (!context) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const allowed = context.author_id === userId || context.owner_id === userId;

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await pool.query("DELETE FROM submissions WHERE id = $1", [id]);

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Unable to delete submission" });
  }
});

export default router;
