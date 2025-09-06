const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER_NAME = "openai-jobs";
const storageConn = process.env["AzureWebJobsStorage"];

app.http("openai-jobs-status", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "openai/jobs/{jobId}",
  handler: async (request, context) => {
    try {
      const jobId = request.params.jobId;
      const blobSvc = BlobServiceClient.fromConnectionString(storageConn);
      const container = blobSvc.getContainerClient(CONTAINER_NAME);
      const blob = container.getBlockBlobClient(`${jobId}.status.json`);
      if (!(await blob.exists())) {
        return { status: 404, jsonBody: { error: "job_not_found" } };
      }
      const dl = await blob.download();
      const text = await streamToString(dl.readableStreamBody);
      return { status: 200, jsonBody: JSON.parse(text || "{}") };
    } catch (err) {
      context.log.error("status_failed", err);
      return { status: 500, jsonBody: { error: "status_failed" } };
    }
  },
});

async function streamToString(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
