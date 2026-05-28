import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import healthRouter from "./health";
import authRouter from "./auth";
import usuariosRouter from "./usuarios";
import escolasRouter from "./escolas";
import alunosRouter from "./alunos";
import empresasRouter from "./empresas";
import motoristasRouter from "./motoristas";
import veiculosRouter from "./veiculos";
import locaisRouter from "./locais";
import temposRouter from "./tempos";
import eventosRouter from "./eventos";
import escalasRouter from "./escalas";
import debugImportRouter from "./debug-import";

const router: IRouter = Router();

// Rotas públicas (sem autenticação)
router.use(healthRouter);
router.use(authRouter);

// A partir daqui, todas as rotas exigem login
router.use(requireAuth);

router.use(usuariosRouter);
router.use(escolasRouter);
router.use(alunosRouter);
router.use(empresasRouter);
router.use(motoristasRouter);
router.use(veiculosRouter);
router.use(locaisRouter);
router.use(temposRouter);
router.use(eventosRouter);
router.use(escalasRouter);
router.use(debugImportRouter);

export default router;
