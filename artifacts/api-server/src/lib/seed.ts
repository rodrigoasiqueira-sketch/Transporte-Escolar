import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureSessionTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);
  } catch (err) {
    logger.error({ err }, "Erro ao criar tabela de sessao");
  }
}

export async function seedAdminIfEmpty() {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(usuariosTable);

    if (count > 0) return;

    const senha = "Atibaia@2025";
    const hash = await bcrypt.hash(senha, 10);
    await db.insert(usuariosTable).values({
      nome: "Administrador",
      email: "admin@atibaia.sp.gov.br",
      senhaHash: hash,
      role: "admin",
      primeiroAcesso: true,
    });
    logger.info(
      { email: "admin@atibaia.sp.gov.br" },
      "Admin inicial criado — troque a senha no primeiro acesso"
    );
  } catch (err) {
    logger.error({ err }, "Erro ao verificar/criar admin inicial");
  }
}
