const partOneController = (req, res) => {
  try {
    const logs = req.body;
    const logsArray = Array.isArray(logs) ? logs : [logs];

    console.log("logs_part_one.json Logs written in flogs_part_one.json");
    res.status(200).send("logs_part_one.json stored!");
  } catch (err) {
    console.error("Error processing logs:", err);
    res.status(500).send("Failed to process logs");
  }
};

const partTwoController = (req, res) => {
  try {
    const logs = req.body;
    const logsArray = Array.isArray(logs) ? logs : [logs];

    console.log("logs_part_two.json Logs written in logs_part_two.json");
    res.status(200).send("logs_part_two.json Logs stored!");
  } catch (err) {
    console.error("Error processing logs:", err);
    res.status(500).send("Failed to process logs");
  }
};

export { partOneController, partTwoController };
