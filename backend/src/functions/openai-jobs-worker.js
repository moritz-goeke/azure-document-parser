const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { AzureOpenAI } = require("openai");

const CONTAINER_NAME = "openai-jobs";
const storageConn = process.env["AzureWebJobsStorage"];
const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
const deployment = process.env["AZURE_OPENAI_DEPLOYMENT_NAME"]; //gpt-4o-cvparser
const apiKey = process.env["AZURE_OPENAI_KEY"];
const apiVersion =
  process.env["AZURE_OPENAI_API_VERSION"] || "2025-01-01-preview";

function wrapAsBlock(text) {
  return `<<<RESUME_TEXT_START>>>
${text || ""}
<<<RESUME_TEXT_END>>>`;
}

app.storageQueue("openai-jobs-worker", {
  queueName: "openai-jobs",
  connection: "AzureWebJobsStorage",
  handler: async (queueMessage, context) => {
    const blobSvc = BlobServiceClient.fromConnectionString(storageConn);
    const container = blobSvc.getContainerClient(CONTAINER_NAME);

    const { jobId } =
      typeof queueMessage === "string"
        ? JSON.parse(queueMessage)
        : queueMessage;

    const statusBlob = container.getBlockBlobClient(`${jobId}.status.json`);
    const inputBlob = container.getBlockBlobClient(`${jobId}.input.json`);

    const writeStatus = async (obj) => {
      const s = JSON.stringify(obj);
      await statusBlob.upload(s, Buffer.byteLength(s), { overwrite: true });
    };

    try {
      await writeStatus({
        jobId,
        status: "running",
        updatedAt: new Date().toISOString(),
      });

      const dl = await inputBlob.download();
      const inputText = await streamToString(dl.readableStreamBody);
      const input = JSON.parse(inputText || "{}");
      const pdfContext = input?.pdfContext;
      const jsonFormatting = JSON.stringify(input?.jsonFormatting);
      const additionalContext = input?.additionalContext;

      const prompt =
        "You are a resume parsing assistant. Given an unstructured resume text (extracted from a PDF), extract structured information and return it in EXACTLY this JSON shape:" +
        jsonFormatting +
        `Return ONLY the JSON object — no explanations, no extra text.
The resume text will be delimited by:<<<RESUME_TEXT_START>>><<<RESUME_TEXT_END>>>`;

      const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
      const messages = [
        { role: "system", content: prompt },
        { role: "system", content: additionalContext },
        { role: "user", content: wrapAsBlock(JSON.stringify(pdfContext)) },
      ];

      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        response_format: { type: "json_object" },
        max_tokens: 16000,
        temperature: 0.2,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      context.log("Completion result:", completion);

      const raw = completion?.choices?.[0]?.message?.content ?? "{}";
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        result = { _raw: raw };
      }

      await writeStatus({
        jobId,
        status: "succeeded",
        updatedAt: new Date().toISOString(),
        result,
      });
    } catch (err) {
      context.log.error("worker_failed", err);
      await writeStatus({
        jobId,
        status: "failed",
        updatedAt: new Date().toISOString(),
        error: String(err?.message || err),
      });
    }
  },
});

async function streamToString(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
