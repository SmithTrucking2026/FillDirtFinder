import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pitsRouter from "./pits";
import quoteLogRouter from "./quote-log";
import driveTimeRouter from "./drive-time";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pitsRouter);
router.use(quoteLogRouter);
router.use(driveTimeRouter);

export default router;
