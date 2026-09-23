import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";
import stationsRouter from "./stations";
import taxiRouter from "./taxi";
import trainsRouter from "./trains";
import usageRouter from "./usage";
import walkRouter from "./walk";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trainsRouter);
router.use(stationsRouter);
router.use(taxiRouter);
router.use(placesRouter);
router.use(usageRouter);
router.use(walkRouter);

export default router;
