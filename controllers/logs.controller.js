import { CrashLog, SystemLog } from "../models/CombinedDiagnostics.js";

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress
  );
}

const partOneController = async (req, res) => {
  try {
    const ipAddress = getClientIp(req);
    const logs = req.body;
    const logsArray = Array.isArray(logs) ? logs : [logs];

    for (const log of logsArray) {
      const crashLog = new CrashLog({
        ...log,
        ipAddress,
        createdAt: new Date(),
      });
      await crashLog.save();
    }

    console.log("Crash logs stored!");
    res.status(200).send("Crash logs stored!");
  } catch (err) {
    console.error("Error processing logs:", err);
    res.status(500).send("Failed to process logs");
  }
};

const partTwoController = async (req, res) => {
  try {
    const ipAddress = getClientIp(req);
    const logs = req.body;
    const logsArray = Array.isArray(logs) ? logs : [logs];

    for (const log of logsArray) {
      const systemLog = new SystemLog({
        ...log,
        ipAddress,
        createdAt: new Date(),
      });
      await systemLog.save();
    }

    console.log("System logs stored!");
    res.status(200).send("System Logs stored!");
  } catch (err) {
    console.error("Error processing logs:", err);
    res.status(500).send("Failed to process logs");
  }
};

export { partOneController, partTwoController };
