import axios from "axios";
import { CombinedDiagnostics } from "../models/CombinedDiagnostics.js";

// Configuration
const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL;

/**
 * System Diagnostics Prediction Controller
 * Handles BSOD, Hang, Shutdown, and Application Crash predictions
 */

// =====================================================
// BSOD PREDICTION
// =====================================================

/**
 * Get BSOD prediction for a single record
 * Route: POST /api/prediction/bsod
 */
const predictBSOD = async (req, res) => {
  try {
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide deviceName!",
      });
    }

    let logData;
    if (deviceName) {
      console.log(
        `Fetching logs for BSOD prediction - Device Name: ${deviceName}`
      );
      logData = await fetchSystemLogsFromDB(deviceName, "BSOD");
      if (!logData) {
        return res.status(404).json({
          success: false,
          message: `No logs found for Device Name: ${deviceName}`,
        });
      }
    }

    const flaskResponse = await axios.post(
      `${FLASK_SERVER_URL}/predict/bsod`,
      logData,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return res.status(200).json({
      success: true,
      type: "bsod",
      data: flaskResponse.data,
    });
  } catch (error) {
    return handlePredictionError(error, res, "BSOD");
  }
};

// =====================================================
// HANG PREDICTION
// =====================================================

/**
 * Get System Hang prediction for a single record
 * Route: POST /api/prediction/hang
 */
const predictHang = async (req, res) => {
  try {
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide deviceName!",
      });
    }

    let logData;
    if (deviceName) {
      console.log(
        `Fetching logs for Hang prediction - Device Name: ${deviceName}`
      );
      logData = await fetchSystemLogsFromDB(deviceName, "HANG");
      if (!logData) {
        return res.status(404).json({
          success: false,
          message: `No logs found for Device Name: ${deviceName}`,
        });
      }
    }

    const flaskResponse = await axios.post(
      `${FLASK_SERVER_URL}/predict/hang`,
      logData,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return res.status(200).json({
      success: true,
      type: "hang",
      data: flaskResponse.data,
    });
  } catch (error) {
    return handlePredictionError(error, res, "Hang");
  }
};

// =====================================================
// SHUTDOWN PREDICTION
// =====================================================

/**
 * Get Unexpected Shutdown prediction for a single record
 * Route: POST /api/prediction/shutdown
 */
const predictShutdown = async (req, res) => {
  try {
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide Device Name",
      });
    }

    let logData;
    if (deviceName) {
      console.log(
        `Fetching logs for Shutdown prediction - Device Name: ${deviceName}`
      );
      logData = await fetchSystemLogsFromDB(deviceName, "SHUT");
      if (!logData) {
        return res.status(404).json({
          success: false,
          message: `No logs found for Device Name: ${deviceName}`,
        });
      }
    }

    const flaskResponse = await axios.post(
      `${FLASK_SERVER_URL}/predict/shutdown`,
      logData,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return res.status(200).json({
      success: true,
      type: "shutdown",
      data: flaskResponse.data,
    });
  } catch (error) {
    return handlePredictionError(error, res, "Shutdown");
  }
};

// =====================================================
// APPLICATION CRASH PREDICTION
// =====================================================

/**
 * Get Application Crash prediction for a single record
 * Route: POST /api/prediction/app-crash
 */
const predictAppCrash = async (req, res) => {
  try {
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide Device Name",
      });
    }

    let logData;
    if (deviceName) {
      console.log(
        `Fetching logs for App Crash prediction - Device Name: ${deviceName}`
      );
      logData = await fetchSystemLogsFromDB(deviceName, "APP");
      if (!logData) {
        return res.status(404).json({
          success: false,
          message: `No logs found for Device Name: ${deviceName}`,
        });
      }
    }

    const flaskResponse = await axios.post(
      `${FLASK_SERVER_URL}/predict/app-crash`,
      logData,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return res.status(200).json({
      success: true,
      type: "app-crash",
      data: flaskResponse.data,
    });
  } catch (error) {
    return handlePredictionError(error, res, "App Crash");
  }
};

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * Check if Flask prediction service is healthy
 * Route: GET /prediction/health
 */
const checkPredictionServiceHealth = async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_SERVER_URL}/health`, {
      timeout: 5000,
    });

    return res.status(200).json({
      success: true,
      service: "Flask Prediction Service",
      status: response.data,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      service: "Flask Prediction Service",
      status: "unavailable",
      error: error.message,
    });
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Centralized error handler for predictions
 */
function handlePredictionError(error, res, predictionType) {
  console.error(`Error in ${predictionType} prediction:`, error.message);

  if (error.response) {
    return res.status(error.response.status).json({
      success: false,
      message: `${predictionType} prediction service error`,
      error: error.response.data,
    });
  } else if (error.code === "ECONNREFUSED") {
    return res.status(503).json({
      success: false,
      message: "Prediction service is unavailable. Please try again later.",
    });
  } else if (error.code === "ETIMEDOUT") {
    return res.status(504).json({
      success: false,
      message: "Prediction service timeout. Please try again.",
    });
  } else {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/**
 * Fetch logs from database by Device Name
 */
async function fetchSystemLogsFromDB(deviceName, type) {
  let bosdLogs = {};
  let appCrashLogs = {};
  let shutDownLogs = {};
  let hangLogs = {};
  try {
    const logs = await CombinedDiagnostics.findOne({ deviceName }).sort({
      createdAt: -1,
    });

    if (!logs) throw new Error("No logs found for this device!");

    if (type === "BSOD") {
      bosdLogs = {
        record_id: 1,
        minidumps: logs?.crash_data?.minidumps,
        minidump_analysis: logs?.crash_data?.minidump_analyses,
        full_memory_dump: logs?.crash_data?.full_memory_dump,
        system_log_available: logs?.crash_data?.system_log_available,
        system_events: logs?.crash_data?.system_events,
        wer_enabled: logs?.crash_data?.wer_enabled,
        wer_reports: logs?.crash_data?.wer_reports,
        driver_verifier: logs?.crash_data?.driver_verifier,
      };

      return bosdLogs;
    }

    if (type === "HANG") {
      hangLogs = {
        record_id: 1,
        minidumps: logs?.crash_data?.minidumps,
        minidump_analysis: logs?.crash_data?.minidump_analyses,
        full_memory_dump: logs?.crash_data?.full_memory_dump,
        system_log_available: logs?.crash_data?.system_log_available,
        system_events: logs?.crash_data?.system_events,
        wer_enabled: logs?.crash_data?.wer_enabled,
        wer_reports: logs?.crash_data?.wer_reports,
        driver_verifier: logs?.crash_data?.driver_verifier,
        perfmon: logs?.system_data?.perfmon,
        reliability: logs?.system_data?.reliability,
      };

      return hangLogs;
    }

    if (type === "SHUT") {
      shutDownLogs = {
        record_id: 1,
        system_log_available: logs?.crash_data?.system_log_available,
        system_events: logs?.crash_data?.system_events,
        wer_enabled: logs?.crash_data?.wer_enabled,
        wer_reports: logs?.crash_data?.wer_reports,
        driver_verifier: logs?.crash_data?.driver_verifier,
        reliability: logs?.system_data?.reliability,
        powercfg: logs?.system_data?.powercfg,
        hardware_events: logs?.system_data?.hardware_events,
        minidumps: logs?.crash_data?.minidumps,
        minidump_analysis: logs?.crash_data?.minidump_analyses,
      };
      return shutDownLogs;
    }

    if (type === "APP") {
      appCrashLogs = {
        record_id: 1,
        application_events: logs?.system_data?.application_events,
        minidumps: logs?.crash_data?.minidumps,
        minidump_analysis: logs?.crash_data?.minidump_analyses,
        wer_enabled: logs?.crash_data?.wer_enabled,
        wer_reports: logs?.crash_data?.wer_reports,
        reliability: logs?.system_data?.reliability,
      };
      return appCrashLogs;
    }
  } catch (err) {
    console.log(err);
    return;
  }
}

export {
  predictBSOD,
  predictAppCrash,
  predictHang,
  predictShutdown,
  checkPredictionServiceHealth,
};
