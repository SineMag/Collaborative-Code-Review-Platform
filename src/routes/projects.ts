import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

router.post("/", requireAuth, validateBody(["name"]), async (req, res) => {
  const { name, description } = req.body as {
    name?: string;
    description?: string;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name cannot be empty" });
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

router.get("/:id/stats", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id as string;

  try {
    const access = await pool.query(
      `
        SELECT p.owner_id, pm.user_id AS member_id
        FROM projects p
        LEFT JOIN project_members pm
          ON pm.project_id = p.id AND pm.user_id = $2
        WHERE p.id = $1
      `,
      [id, userId]
    );

    if (access.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = access.rows[0].owner_id === userId;
    const isMember = Boolean(access.rows[0].member_id);

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const avgReviewTimeResult = await pool.query(
      `
        SELECT AVG(EXTRACT(EPOCH FROM (r.first_review_at - s.created_at))) AS avg_seconds
        FROM submissions s
        JOIN (
          SELECT submission_id, MIN(created_at) AS first_review_at
          FROM reviews
          GROUP BY submission_id
        ) r ON r.submission_id = s.id
        WHERE s.project_id = $1
      `,
      [id]
    );

    const statusCountsResult = await pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'changes_requested') AS changes_requested,
          COUNT(*) FILTER (WHERE status IN ('approved', 'changes_requested')) AS reviewed
        FROM submissions
        WHERE project_id = $1
      `,
      [id]
    );

    const reviewerActivityResult = await pool.query(
      `
        SELECT r.reviewer_id, u.name, COUNT(*)::int AS review_count
        FROM reviews r
        JOIN submissions s ON s.id = r.submission_id
        JOIN users u ON u.id = r.reviewer_id
        WHERE s.project_id = $1
        GROUP BY r.reviewer_id, u.name
        ORDER BY review_count DESC
      `,
      [id]
    );

    const topSubmissionResult = await pool.query(
      `
        SELECT s.id, s.title, COUNT(c.id)::int AS comment_count
        FROM submissions s
        LEFT JOIN comments c ON c.submission_id = s.id
        WHERE s.project_id = $1
        GROUP BY s.id, s.title, s.created_at
        ORDER BY comment_count DESC, s.created_at DESC
        LIMIT 1
      `,
      [id]
    );

    const statusCounts = statusCountsResult.rows[0] || {
      approved: 0,
      changes_requested: 0,
      reviewed: 0
    };

    const reviewedCount = Number(statusCounts.reviewed) || 0;
    const approvedCount = Number(statusCounts.approved) || 0;
    const changesRequestedCount = Number(statusCounts.changes_requested) || 0;

    const stats = {
      average_review_time_seconds: avgReviewTimeResult.rows[0]?.avg_seconds
        ? Number(avgReviewTimeResult.rows[0].avg_seconds)
        : null,
      approval_rate: reviewedCount ? approvedCount / reviewedCount : null,
      changes_requested_rate: reviewedCount ? changesRequestedCount / reviewedCount : null,
      reviewer_activity: reviewerActivityResult.rows,
      top_submission_by_comments: topSubmissionResult.rows[0] || null
    };

    return res.status(200).json({ stats });
  } catch {
    return res.status(500).json({ message: "Unable to fetch project stats" });
  }
});

router.post("/:id/members", requireAuth, validateBody(["userId"]), async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body as { userId?: string };

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
