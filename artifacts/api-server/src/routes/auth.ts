import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { z } from "zod";

const router: IRouter = Router();

const LoginBody = z.object({
  email: z.string().min(1),
  senha: z.string().min(1),
});

const AlterarSenhaBody = z.object({
  senha_atual: z.string().min(1),
  senha_nova: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, senha } = LoginBody.parse(req.body);
    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.nome = user.nome;
    req.session.role = user.role;
    req.session.primeiroAcesso = user.primeiroAcesso;

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      primeiro_acesso: user.primeiroAcesso,
    });
  } catch (err) {
    req.log.error({ err }, "Error during login");
    res.status(400).json({ error: "Dados inválidos" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    nome: req.session.nome,
    email: req.session.email,
    role: req.session.role,
    primeiro_acesso: req.session.primeiroAcesso,
  });
});

router.post("/auth/alterar-senha", requireAuth, async (req, res) => {
  try {
    const { senha_atual, senha_nova } = AlterarSenhaBody.parse(req.body);

    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, req.session.userId!))
      .limit(1);

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const valid = await bcrypt.compare(senha_atual, user.senhaHash);
    if (!valid) return res.status(400).json({ error: "Senha atual incorreta" });

    const hash = await bcrypt.hash(senha_nova, 10);
    await db
      .update(usuariosTable)
      .set({ senhaHash: hash, primeiroAcesso: false })
      .where(eq(usuariosTable.id, user.id));

    req.session.primeiroAcesso = false;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error changing password");
    res.status(400).json({ error: "Dados inválidos" });
  }
});

export default router;
