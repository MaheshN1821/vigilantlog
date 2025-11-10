import express from "express";
const router = express.Router();
import {
  register,
  login,
  updateSystemName,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

router.post("/register", register);
router.post("/login", login);

router.put("/device-name", authMiddleware, updateSystemName);

export default router;
