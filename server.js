import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import correlateLogs from "./controllers/correlateLogs.js";
import logsHandler from "./routes/logs.route.js";

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());

app.use("/api/logs", logsHandler);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World!" });
});

const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Mongo DB is connected!");
    app.listen(3000, () => {
      console.log("Server is listening at 3000...");
    });
    cron.schedule("* * * * *", async () => {
      try {
        await correlateLogs();
      } catch (err) {
        console.error("Error during logs correlation:", err);
      }
    });
  })
  .catch((err) => {
    console.log(err);
  });
