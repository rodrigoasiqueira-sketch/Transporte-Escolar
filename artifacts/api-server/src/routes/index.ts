import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

router.use(healthRouter);
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
