import express from "express";
const router = express.Router();
import {
  predictAppCrash,
  predictBSOD,
  predictHang,
  predictShutdown,
  checkPredictionServiceHealth,
} from "../controllers/prediction.controller.js";

/**
 * System Diagnostics Prediction Routes
 * Base path: /prediction
 *
 * Handles 4 types of predictions:
 * 1. BSOD (Blue Screen of Death)
 * 2. System Hang
 * 3. Unexpected Shutdown
 * 4. Application Crash
 */

// =====================================================
// INDIVIDUAL PREDICTION ROUTES
// =====================================================

/**
 * @route   POST /prediction/bsod
 * @desc    Get BSOD prediction for a single record
 * @access  Public/Private
 * @body    { recordId: "string" } OR { logData: {...} }
 */
router.post("/bsod", predictBSOD);

/**
 * @route   POST /prediction/hang
 * @desc    Get System Hang prediction for a single record
 * @access  Public/Private
 * @body    { recordId: "string" } OR { logData: {...} }
 */
router.post("/hang", predictHang);

/**
 * @route   POST /prediction/shutdown
 * @desc    Get Unexpected Shutdown prediction for a single record
 * @access  Public/Private
 * @body    { recordId: "string" } OR { logData: {...} }
 */
router.post("/shutdown", predictShutdown);

/**
 * @route   POST /prediction/app-crash
 * @desc    Get Application Crash prediction for a single record
 * @access  Public/Private
 * @body    { recordId: "string" } OR { logData: {...} }
 */
router.post("/app-crash", predictAppCrash);

// =====================================================
// HEALTH CHECK ROUTE
// =====================================================

/**
 * @route   GET /prediction/health
 * @desc    Check Flask prediction service health
 * @access  Public
 */
router.get("/health", checkPredictionServiceHealth);

export default router;
