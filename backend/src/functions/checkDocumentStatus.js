const { app } = require("@azure/functions");
const axios = require("axios");

const key = process.env.DOCUMENT_INTELLIGENCE_KEY;

app.http("checkDocumentStatus", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const encodedJobId = request.query.get("jobId");
      if (!encodedJobId) {
        return { status: 400, body: "Missing jobId" };
      }

      const operationUrl = decodeURIComponent(encodedJobId);

      const res = await axios.get(operationUrl, {
        headers: {
          "Ocp-Apim-Subscription-Key": key,
        },
      });

      const status = res.data.status;

      if (status === "succeeded") {
        return {
          status: 200,
          body: JSON.stringify({
            status: "succeeded",
            analyzeResult: res.data.analyzeResult?.documents
              ? res.data.analyzeResult.documents[0]
              : res.data.analyzeResult,
          }),
        };
      } else if (status === "failed") {
        return {
          status: 200,
          body: JSON.stringify({ status: "failed" }),
        };
      } else {
        return {
          status: 200,
          body: JSON.stringify({ status: "running" }),
        };
      }
    } catch (e) {
      context.log(e);
      return { status: 500, body: "Error polling job status." };
    }
  },
});
