import { NextFunction, Request, Response } from "express";

type RequiredField = {
  key: string;
  message?: string;
};

export function validateBody(required: Array<string | RequiredField>) {
  const fields = required.map((field) =>
    typeof field === "string" ? { key: field } : field
  );

  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      if (req.body?.[field.key] === undefined || req.body?.[field.key] === null) {
        return res.status(400).json({ message: field.message || `${field.key} is required` });
      }
    }

    return next();
  };
}
