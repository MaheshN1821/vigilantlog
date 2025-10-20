import express from "express";
import {
  partOneController,
  partTwoController,
} from "../controllers/logs.controller.js";
const router = express.Router();

router.post("/part-one", partOneController);

router.post("/part-two", partTwoController);

export default router;
