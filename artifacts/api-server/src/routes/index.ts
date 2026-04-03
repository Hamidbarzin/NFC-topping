import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cardsRouter from "./cards";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import creditsRouter from "./credits";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cardsRouter);
router.use(authRouter);
router.use(profilesRouter);
router.use(creditsRouter);
router.use(adminRouter);

export default router;
