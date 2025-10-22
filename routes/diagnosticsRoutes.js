import express from "express";
import logMergerService from "../services/logMergerService.js";
import { CombinedDiagnostics } from "../models/CombinedDiagnostics.js";
import mongoose from "mongoose";
import redisClient from "../config/redis.js";

const router = express.Router();

// Helper function to extract IP address
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

// API 1: Part-One - Crash Data
router.post("/part-one", async (req, res) => {
  try {
    const ipAddress = getClientIP(req);
    const crashData = req.body;

    console.log(`Part-One payload received:`);
    console.log(`Body is empty: ${Object.keys(crashData).length === 0}`);
    console.log(`Body keys:`, Object.keys(crashData));
    console.log(`Full body:`, JSON.stringify(crashData).substring(0, 200));

    console.log(`Part-One received from ${ipAddress}`);

    // Store in Upstash Redis
    const result = await logMergerService.storePartOne(ipAddress, crashData);

    // Check if there's already a waiting Part-Two
    const waitingPartTwo = await logMergerService.checkForWaitingPartTwo(
      ipAddress
    );

    if (waitingPartTwo) {
      // Merge immediately
      const mergeResult = await logMergerService.mergeAndSave(
        { crashData, receivedAt: new Date().toISOString() },
        waitingPartTwo.systemData,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: "Part-One received and merged with waiting Part-Two",
        merged: true,
        documentId: mergeResult._id,
        deviceName: mergeResult.deviceName,
        timeDifference: mergeResult.timeDifference,
      });
    }

    res.status(200).json({
      success: true,
      message: "Part-One received and stored in Upstash Redis",
      merged: false,
      bucketKey: result.bucketKey,
      ipAddress,
    });
  } catch (error) {
    console.error("Error in part-one endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process part-one",
      error: error.message,
    });
  }
});

// API 2: Part-Two - System Data
router.post("/part-two", async (req, res) => {
  try {
    const ipAddress = getClientIP(req);
    const systemData = req.body;

    console.log(`📥 Part-Two received from ${ipAddress}`);

    // Store and attempt merge
    const result = await logMergerService.storePartTwo(ipAddress, systemData);

    res.status(200).json({
      success: true,
      message: result.message,
      merged: result.merged,
      documentId: result.documentId,
      ipAddress,
    });
  } catch (error) {
    console.error("Error in part-two endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process part-two",
      error: error.message,
    });
  }
});

// Get diagnostics for a specific device
router.get("/diagnostics/:deviceName", async (req, res) => {
  try {
    const { deviceName } = req.params;
    const hours = parseInt(req.query.hours) || 2;

    const diagnostics = await logMergerService.getRecentDiagnostics(
      deviceName,
      hours
    );

    res.json({
      success: true,
      deviceName,
      count: diagnostics.length,
      timeRange: `Last ${hours} hour(s)`,
      data: diagnostics,
    });
  } catch (error) {
    console.error("Error getting diagnostics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get diagnostics",
      error: error.message,
    });
  }
});

// Get statistics for a device
router.get("/diagnostics/:deviceName/stats", async (req, res) => {
  try {
    const { deviceName } = req.params;
    const hours = parseInt(req.query.hours) || 2;

    const stats = await logMergerService.getStatistics(deviceName, hours);

    res.json({
      success: true,
      deviceName,
      timeRange: `Last ${hours} hour(s)`,
      statistics: stats,
    });
  } catch (error) {
    console.error("Error getting statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
});

// Get all active devices
router.get("/devices/active", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 2;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const devices = await CombinedDiagnostics.distinct("deviceName", {
      createdAt: { $gte: startTime },
    });

    res.json({
      success: true,
      count: devices.length,
      timeRange: `Last ${hours} hour(s)`,
      devices,
    });
  } catch (error) {
    console.error("Error getting active devices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active devices",
      error: error.message,
    });
  }
});

// Get devices with crashes
router.get("/devices/crashes", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;

    const devices = await CombinedDiagnostics.getDevicesWithCrashes(hours);

    res.json({
      success: true,
      count: devices.length,
      timeRange: `Last ${hours} hour(s)`,
      devices,
    });
  } catch (error) {
    console.error("Error getting devices with crashes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get devices with crashes",
      error: error.message,
    });
  }
});

// Manual cleanup of orphaned Redis entries
router.post("/maintenance/cleanup-redis", async (req, res) => {
  try {
    const cleaned = await logMergerService.cleanupOrphanedEntries();

    res.json({
      success: true,
      message: "Upstash Redis cleanup completed",
      entriesCleaned: cleaned,
    });
  } catch (error) {
    console.error("Error cleaning Redis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup Redis",
      error: error.message,
    });
  }
});

// Health check
router.get("/health", async (req, res) => {
  try {
    // Check Upstash Redis
    await redisClient.ping();

    // Check MongoDB
    const mongoStatus = mongoose.connection.readyState === 1;

    res.json({
      success: true,
      services: {
        upstash_redis: "connected",
        mongodb: mongoStatus ? "connected" : "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

export default router;
