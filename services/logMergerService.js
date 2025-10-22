import redisClient from "../config/redis.js";
import { CombinedDiagnostics } from "../models/CombinedDiagnostics.js";

class LogMergerService {
  constructor() {
    this.BUCKET_TTL = 300; // 5 minutes TTL for Redis buckets
    this.MATCH_WINDOW = 180; // 3 minutes matching window (180 seconds)
  }

  // Generate bucket key based on IP and time window
  generateBucketKey(ipAddress, timestamp = Date.now()) {
    const timeSlot = Math.floor(timestamp / 1000 / this.MATCH_WINDOW);
    return `log:${ipAddress}:${timeSlot}`;
  }

  // Store Part-One (Crash Data) in Upstash Redis
  async storePartOne(ipAddress, crashData) {
    try {
      const bucketKey = this.generateBucketKey(ipAddress);
      const data = {
        type: "part-one",
        ipAddress,
        crashData,
        receivedAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      await redisClient.setex(bucketKey, this.BUCKET_TTL, JSON.stringify(data));

      console.log(`Part-One stored in Upstash: ${bucketKey}`);
      return { success: true, bucketKey };
    } catch (error) {
      console.error("Error storing part-one:", error);
      throw error;
    }
  }

  // Store Part-Two (System Data) and attempt merge
  async storePartTwo(ipAddress, systemData) {
    try {
      const currentTime = Date.now();
      const bucketKey = this.generateBucketKey(ipAddress, currentTime);

      // Check current time slot
      let partOneData = await redisClient.get(bucketKey);

      // If not found in current slot, check previous time slot
      if (!partOneData) {
        const prevBucketKey = this.generateBucketKey(
          ipAddress,
          currentTime - this.MATCH_WINDOW * 1000
        );
        partOneData = await redisClient.get(prevBucketKey);

        if (partOneData) {
          console.log(`Found Part-One in previous bucket: ${prevBucketKey}`);
        }
      }

      if (partOneData) {
        // Parse and merge
        const partOne =
          typeof partOneData === "string"
            ? JSON.parse(partOneData)
            : partOneData;

        const result = await this.mergeAndSave(partOne, systemData, ipAddress);

        // Delete from Redis after successful merge
        await redisClient.del(bucketKey);

        return {
          success: true,
          merged: true,
          documentId: result._id,
          message: "Logs merged and saved to database",
        };
      } else {
        // Store Part-Two temporarily (waiting for Part-One)
        const data = {
          type: "part-two",
          ipAddress,
          systemData,
          receivedAt: new Date().toISOString(),
          timestamp: currentTime,
        };

        const partTwoKey = `${bucketKey}:part-two`;
        await redisClient.setex(
          partTwoKey,
          this.BUCKET_TTL,
          JSON.stringify(data)
        );

        console.log(
          `Part-Two buffered in Upstash, waiting for Part-One: ${partTwoKey}`
        );
        return {
          success: true,
          merged: false,
          message: "Part-Two buffered, waiting for Part-One",
        };
      }
    } catch (error) {
      console.error("Error storing part-two:", error);
      throw error;
    }
  }

  // Check if there's a waiting Part-Two for the received Part-One
  async checkForWaitingPartTwo(ipAddress) {
    try {
      const bucketKey = this.generateBucketKey(ipAddress);
      const partTwoKey = `${bucketKey}:part-two`;

      const partTwoData = await redisClient.get(partTwoKey);

      if (partTwoData) {
        const partTwo =
          typeof partTwoData === "string"
            ? JSON.parse(partTwoData)
            : partTwoData;

        await redisClient.del(partTwoKey);
        return partTwo;
      }

      return null;
    } catch (error) {
      console.error("Error checking for waiting part-two:", error);
      return null;
    }
  }

  // Merge Part-One and Part-Two, then save to MongoDB
  async mergeAndSave(partOne, systemData, ipAddress) {
    try {
      // Extract device name from system data
      const deviceName =
        systemData?.powercfg?.battery_report?.["COMPUTER NAME"] ||
        systemData?.powercfg?.battery_report?.NAME ||
        "UNKNOWN";

      // Generate unique identifier
      const timestamp = Date.now();
      const uniqueIdentifier = `${deviceName}-${ipAddress}-${timestamp}`;

      // Calculate time difference
      const api1Time = new Date(partOne.receivedAt);
      const api2Time = new Date();
      const timeDifference = Math.abs(api2Time - api1Time) / 1000;

      const mergedDocument = {
        deviceName,
        ipAddress,
        uniqueIdentifier,

        crash_data: partOne.crashData,
        system_data: systemData,

        api1ReceivedAt: api1Time,
        api2ReceivedAt: api2Time,
        mergedAt: new Date(),
        timeDifference,
        createdAt: new Date(),
      };

      const result = await CombinedDiagnostics.create(mergedDocument);

      console.log(`Merged document saved: ${deviceName} (ID: ${result._id})`);
      console.log(`Time difference: ${timeDifference.toFixed(2)}s`);

      return result;
    } catch (error) {
      console.error("Error merging and saving:", error);
      throw error;
    }
  }

  // Get recent diagnostics for a device
  async getRecentDiagnostics(deviceName, hours = 2) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await CombinedDiagnostics.find({
        deviceName,
        createdAt: { $gte: startTime },
      })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error("Error getting diagnostics:", error);
      throw error;
    }
  }

  // Get statistics
  async getStatistics(deviceName, hours = 2) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await CombinedDiagnostics.aggregate([
        {
          $match: {
            deviceName,
            createdAt: { $gte: startTime },
          },
        },
        {
          $group: {
            _id: "$deviceName",
            total_records: { $sum: 1 },
            records_with_crashes: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      { $size: { $ifNull: ["$crash_data.minidumps", []] } },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            avg_time_difference: { $avg: "$timeDifference" },
            min_time_difference: { $min: "$timeDifference" },
            max_time_difference: { $max: "$timeDifference" },
            first_record: { $min: "$createdAt" },
            last_record: { $max: "$createdAt" },
          },
        },
      ]);

      return stats[0] || null;
    } catch (error) {
      console.error("Error getting statistics:", error);
      throw error;
    }
  }

  // Clean up orphaned Redis entries
  async cleanupOrphanedEntries() {
    try {
      const keys = await redisClient.keys("log:*");
      const now = Date.now();
      let cleaned = 0;

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const parsed = typeof data === "string" ? JSON.parse(data) : data;
          const age = now - parsed.timestamp;

          if (age > this.BUCKET_TTL * 1000) {
            await redisClient.del(key);
            cleaned++;
          }
        }
      }

      console.log(`🧹 Cleaned up ${cleaned} orphaned Upstash Redis entries`);
      return cleaned;
    } catch (error) {
      console.error("Error cleaning orphaned entries:", error);
      return 0;
    }
  }
}

export default new LogMergerService();
