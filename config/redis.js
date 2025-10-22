import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Test connection
try {
  await redisClient.ping();
  console.log("Connected to Upstash Redis");
} catch (error) {
  console.error("Upstash Redis connection error:", error);
  process.exit(1);
}

export default redisClient;
