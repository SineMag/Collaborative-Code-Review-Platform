import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { UserRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

function isRole(value: unknown): value is UserRole {
  return value === "reviewer" || value === "submitter";
}

router.post("/register", validateBody(["name", "email", "password"]), async (req, res) => {
  const { name, email, password, role, displayPicture } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    displayPicture?: string;
  };

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, and password are required" });
  }

  if (!email.includes("@")) {
    return res.status(400).json({ message: "email must be valid" });
  }

  const resolvedRole: UserRole = isRole(role) ? role : "submitter";

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role, display_picture)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, role, display_picture, created_at
      `,
      [name, email, passwordHash, resolvedRole, displayPicture || null]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    const message = (error as { code?: string }).code === "23505"
      ? "Email already exists"
      : "Unable to register";

    return res.status((error as { code?: string }).code === "23505" ? 409 : 500).json({ message });
  }
});

router.post("/login", validateBody(["email", "password"]), async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  try {
    const result = await pool.query(
      `
        SELECT id, name, email, password_hash, role, display_picture, created_at
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ role: user.role }, secret, {
      subject: user.id,
      expiresIn
    });

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      display_picture: user.display_picture,
      created_at: user.created_at
    };

    return res.status(200).json({ token, user: responseUser });
  } catch {
    return res.status(500).json({ message: "Unable to login" });
  }
});

export default router;
