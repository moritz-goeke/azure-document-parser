const { app } = require("@azure/functions");
const DocumentIntelligence =
    require("@azure-rest/ai-document-intelligence").default,
  { isUnexpected } = require("@azure-rest/ai-document-intelligence");

const key = process.env.DOCUMENT_INTELLIGENCE_KEY;
const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;

app.http("startDocumentAnalysis", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const fileInBase64 = request.params.fileInBase64;
      const selectedFileType =
        request?.params?.selectedFileType || "prebuilt-read";
      const base64_data = fileInBase64.split(",")[1];

      const client = DocumentIntelligence(endpoint, { key });

      const initialResponse = await client
        .path("/documentModels/{modelId}:analyze", selectedFileType)
        .post({
          contentType: "application/json",
          body: {
            base64Source: base64_data,
          },
        });

      if (isUnexpected(initialResponse)) {
        throw initialResponse.body.error;
      }

      const operationLocation = initialResponse.headers["operation-location"];
      if (!operationLocation) {
        throw new Error("No operation-location returned by Azure");
      }

      return {
        status: 202,
        body: JSON.stringify({ jobId: encodeURIComponent(operationLocation) }), // safely send back URL as a token
      };
    } catch (e) {
      context.log(e);
      return { status: 500, body: "Error starting analysis." };
    }
  },
});
