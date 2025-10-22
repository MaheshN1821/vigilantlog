import { CrashLog, SystemLog } from "../models/Logs.js";

async function correlateLogs() {
  const unlinkedCrashLogs = await CrashLog.find({
    deviceName: { $exists: false },
  });

  for (const crashLog of unlinkedCrashLogs) {
    const startWindow = new Date(crashLog.createdAt.getTime() + 110000);
    const endWindow = new Date(crashLog.createdAt.getTime() + 160000);

    const matchingSystemLog = await SystemLog.findOne({
      ipAddress: crashLog.ipAddress,
      createdAt: { $gte: startWindow, $lte: endWindow },
      deviceName: { $exists: true },
    });

    if (matchingSystemLog) {
      const deviceName =
        matchingSystemLog.powercfg?.battery_report?.["COMPUTER NAME"] ||
        "Unknown";

      crashLog.deviceName = deviceName;
      crashLog.linkedSystemLogId = matchingSystemLog._id;
      await crashLog.save();

      matchingSystemLog.linkedCrashLogId = crashLog._id;
      await matchingSystemLog.save();

      console.log(
        `Linked CrashLog ${crashLog._id} with SystemLog ${matchingSystemLog._id}, Device: ${deviceName}`
      );
    }
  }
}

export default correlateLogs;
