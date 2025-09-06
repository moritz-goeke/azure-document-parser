const { app } = require("@azure/functions");
const { QueueServiceClient } = require("@azure/storage-queue");
const { BlobServiceClient } = require("@azure/storage-blob");
const crypto = require("crypto");

const QUEUE_NAME = "openai-jobs";
const CONTAINER_NAME = "openai-jobs";
const storageConn = process.env["AzureWebJobsStorage"];

async function ensureInfra() {
  const blobSvc = BlobServiceClient.fromConnectionString(storageConn);
  const container = blobSvc.getContainerClient(CONTAINER_NAME);
  if (!(await container.exists())) await container.create();

  const queueSvc = QueueServiceClient.fromConnectionString(storageConn);
  const queue = queueSvc.getQueueClient(QUEUE_NAME);
  if (!(await queue.exists())) await queue.create();

  return { container, queue };
}

app.http("openai-jobs-submit", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "openai/jobs",
  handler: async (request, context) => {
    try {
      const { container, queue } = await ensureInfra();
      const body = await request.json();

      const jobId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const input = {
        jobId,
        pdfContext: body?.pdfContext ?? "No context provided",
        jsonFormatting:
          body?.jsonFormatting ?? "No specific JSON structure provided",
        additionalContext:
          body?.additionalContext ?? "No additional context provided",
        createdAt,
      };
      const inputBlob = container.getBlockBlobClient(`${jobId}.input.json`);
      const inputStr = JSON.stringify(input);
      await inputBlob.upload(inputStr, Buffer.byteLength(inputStr));

      const status = { status: "queued", jobId, createdAt };
      const statusBlob = container.getBlockBlobClient(`${jobId}.status.json`);
      const statusStr = JSON.stringify(status);
      await statusBlob.upload(statusStr, Buffer.byteLength(statusStr));

      await queue.sendMessage(JSON.stringify({ jobId }));

      return {
        status: 202,
        jsonBody: { ...status, statusUrl: `/api/openai/jobs/${jobId}` },
      };
    } catch (err) {
      context.log.error("submit_failed", err);
      return { status: 500, jsonBody: { error: "submit_failed" } };
    }
  },
});
