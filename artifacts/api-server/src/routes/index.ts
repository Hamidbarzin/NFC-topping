import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cardsRouter from "./cards";
import publicRouter from "./public";
import profilesRouter from "./profiles";
import adminRouter from "./admin";
import clientAccessRouter from "./client-access";
import settingsCardRouter from "./settings-card";
import uploadRouter from "./upload";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cardsRouter);
router.use(publicRouter);
router.use(profilesRouter);
router.use(adminRouter);
router.use(clientAccessRouter);
router.use(settingsCardRouter);
router.use(uploadRouter);
router.use(leadsRouter);

router.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router;
