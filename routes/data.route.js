import express from "express";
import getRecoverySteps from "../controllers/data.controller.js";
const router = express.Router();

router.get("/:type", getRecoverySteps);

export default router;
