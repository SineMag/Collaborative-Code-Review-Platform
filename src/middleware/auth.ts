import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type UserRole = "reviewer" | "submitter";

type AuthPayload = {
  sub: string;
  role: UserRole;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireReviewer(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "reviewer") {
    return res.status(403).json({ message: "Reviewer role required" });
  }

  return next();
}
