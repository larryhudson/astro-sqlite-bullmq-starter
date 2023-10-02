import { Worker } from "bullmq";
import { updateRecord } from "./src/utils/db.js";

const worker = new Worker(
  "taskQueue",
  async (job) => {
    if (job.name === "processNote") {
      updateRecord("notes", job.data.id, { status: "processing" });
      await new Promise((res) => setTimeout(res, 5000));
      const now = new Date();
      const dateString = now.toISOString();
      updateRecord("notes", job.data.id, {
        status: "processed",
        processed_at: dateString,
      });
    }
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  },
);

worker.on("active", (job) => {
  console.log(`${job.id} has started!`);
});

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});
