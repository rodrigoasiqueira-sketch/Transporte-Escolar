import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    email: string;
    nome: string;
    role: string;
    primeiroAcesso: boolean;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Permissão negada" });
  }
  next();
}
