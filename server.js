import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import logsHandler from "./routes/logs.route.js";

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

app.use("/api/logs", logsHandler);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World!" });
});

export default app;
