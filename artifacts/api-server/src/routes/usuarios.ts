import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { z } from "zod";

const router: IRouter = Router();

const CriarUsuarioBody = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  role: z.enum(["admin", "operador"]),
});

const AtualizarUsuarioBody = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  role: z.enum(["admin", "operador"]).optional(),
  ativo: z.boolean().optional(),
});

function mapUser(u: typeof usuariosTable.$inferSelect) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    primeiro_acesso: u.primeiroAcesso,
    ativo: u.ativo,
    criado_em: u.criadoEm.toISOString(),
  };
}

router.get("/usuarios", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usuariosTable).orderBy(usuariosTable.nome);
    res.json(users.map(mapUser));
  } catch (err) {
    req.log.error({ err }, "Error listing usuarios");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/usuarios", requireAdmin, async (req, res) => {
  try {
    const body = CriarUsuarioBody.parse(req.body);
    const num = Math.floor(1000 + Math.random() * 9000);
    const tempSenha = `Atibaia@${num}`;
    const hash = await bcrypt.hash(tempSenha, 10);
    const [user] = await db
      .insert(usuariosTable)
      .values({
        nome: body.nome,
        email: body.email.toLowerCase().trim(),
        senhaHash: hash,
        role: body.role,
        primeiroAcesso: true,
      })
      .returning();
    res.status(201).json({ ...mapUser(user), senha_temporaria: tempSenha });
  } catch (err) {
    req.log.error({ err }, "Error creating usuario");
    res.status(400).json({ error: "Email já cadastrado ou dados inválidos" });
  }
});

router.put("/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = AtualizarUsuarioBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.email !== undefined) updates.email = body.email.toLowerCase().trim();
    if (body.role !== undefined) updates.role = body.role;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    const [user] = await db
      .update(usuariosTable)
      .set(updates)
      .where(eq(usuariosTable.id, id))
      .returning();
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(mapUser(user));
  } catch (err) {
    req.log.error({ err }, "Error updating usuario");
    res.status(400).json({ error: "Dados inválidos" });
  }
});

router.delete("/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.session.userId) {
      return res.status(400).json({ error: "Não é possível desativar seu próprio usuário" });
    }
    await db.update(usuariosTable).set({ ativo: false }).where(eq(usuariosTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting usuario");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/usuarios/:id/resetar-senha", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const num = Math.floor(1000 + Math.random() * 9000);
    const tempSenha = `Atibaia@${num}`;
    const hash = await bcrypt.hash(tempSenha, 10);
    const [user] = await db
      .update(usuariosTable)
      .set({ senhaHash: hash, primeiroAcesso: true })
      .where(eq(usuariosTable.id, id))
      .returning();
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ senha_temporaria: tempSenha });
  } catch (err) {
    req.log.error({ err }, "Error resetting password");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
