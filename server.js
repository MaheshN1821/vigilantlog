import express from "express";
import bodyParser from "body-parser";
import logsHandler from "./routes/logs.route.js";

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

app.use("/logs", logsHandler);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World!" });
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
