import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Box,
  Button,
  Divider,
  Grid2,
  Icon,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  styled,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import * as React from "react";
import AzureLogo from "../assets/azure_logo.png";
import { DARK_BLUE, LIGHT_BLUE, WHITE } from "../components/consts";
import JsonEditor from "../components/JsonEditor";
import NotificationSnackbar from "../components/NotificationSnackbar";

export default function MainPage() {
  const [loadingAnswer, setLoadingAnswer] = React.useState(false);

  const [analysisResult, setAnalysisResult] = React.useState("");

  const [openNotification, setOpenNotification] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState("");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const [base64File, setBase64File] = React.useState("");

  async function analyzeWithDocumentIntelligence() {
    try {
      setLoadingAnswer(true);

      const resStart = await axios.post("/api/startDocumentAnalysis", {
        fileInBase64: base64File,
        selectedFileType: "prebuilt-read",
      });

      const jobId = resStart.data.jobId;

      const pollJob = async (jobId) => {
        while (true) {
          const res = await axios.get(
            `/api/checkDocumentStatus?jobId=${jobId}`
          );
          if (res.data.status === "succeeded") return res.data.analyzeResult;
          if (res.data.status === "failed") throw new Error("Analysis failed");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      };

      const resultData = await pollJob(jobId);

      const submitRes = await axios.post(
        "/api/openai/jobs",
        {
          pdfContext: JSON.stringify(resultData.content),
          additionalContext: additionalContext,
          jsonFormatting: JSON.stringify(jsonFormat),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const { statusUrl } = submitRes.data;

      let attempt = 0;
      const maxAttempts = 180; // ~6 min with 2s
      while (attempt < maxAttempts) {
        await sleep(2000);
        const { data } = await axios.get(statusUrl);

        if (data.status === "succeeded") {
          setAnalysisResult(data.result);
          setNotificationMessage("Parsing complete.");
          break;
        }
        if (data.status === "failed") {
          setNotificationMessage("Error during parsing.");
          break;
        }
        attempt++;
      }
    } catch (e) {
      console.error(e);
      setNotificationMessage("Error during parsing.");
    } finally {
      setOpenNotification(true);
      setLoadingAnswer(false);
    }
  }

  const [documentTitle, setDocumentTitle] = React.useState("");

  const [fileUrl, setFileUrl] = React.useState("");

  const [jsonFormat, setJsonFormat] = React.useState("");
  const [additionalContext, setAdditionalContext] = React.useState("");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        width: 1,
      }}
    >
      <NotificationSnackbar
        message={notificationMessage}
        open={openNotification}
        setOpen={setOpenNotification}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: 1,
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: 1,
            bgcolor: DARK_BLUE,
            height: 95,
            justifyContent: "space-between",
            alignItems: "center",
            userSelect: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                ml: 5,
                fontFamily: "Lato",
                color: WHITE,
                fontSize: { xs: 18, md: 22 },
                fontWeight: 100,
                userSelect: "none",
              }}
            >
              Azure Sample App | PDF Document Parser
            </Typography>
          </Box>
          <Icon sx={{ width: "auto", height: 40, mr: 5 }}>
            <img draggable={false} src={AzureLogo} height="40px" />
          </Icon>
        </Box>
        <Box sx={{ height: 50 }} />
        <Box sx={{ display: "flex", flexDirection: "row", width: 1 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: 0.5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UploadPdfContext
              setDocumentTitle={setDocumentTitle}
              setBase64File={setBase64File}
              setFileUrl={setFileUrl}
            />
            <Typography sx={{ userSelect: "none", color: DARK_BLUE, mt: -0.5 }}>
              Upload PDF
            </Typography>
            {documentTitle && (
              <Typography sx={{ my: 2, fontSize: 14 }}>
                Uploaded document: {documentTitle}
              </Typography>
            )}

            {fileUrl !== "" && (
              <embed
                src={fileUrl}
                type="application/pdf"
                width="70%"
                height="600px"
              />
            )}
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: 0.5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <JsonEditor
              label="CV JSON"
              onValidJson={(data) => {
                setJsonFormat(data);
              }}
            />

            <Paper
              elevation={2}
              sx={{ mt: 2, p: 2, borderRadius: 3, width: 0.8 }}
            >
              <Stack spacing={1.5}>
                <Typography variant="h6">Additional Context</Typography>
                <TextField
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  multiline
                  rows={4}
                  placeholder="Put additional context here"
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        fontSize: 14,
                      },
                    },
                  }}
                  fullWidth
                />
              </Stack>
            </Paper>
          </Box>
        </Box>
        <Button
          onClick={() => analyzeWithDocumentIntelligence()}
          size="large"
          disabled={!documentTitle}
          sx={{ borderRadius: 20, mt: 3 }}
          variant="outlined"
        >
          Parse CV
        </Button>
        {loadingAnswer && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: 0.5,
              mt: 7,
            }}
          >
            <LinearProgress />
            <Typography
              align="left"
              sx={{ fontSize: 12, fontStyle: "italic", mt: 0.5 }}
            >
              Parsing Data... This can take up to 5 minutes.
            </Typography>
          </Box>
        )}
        {analysisResult && !loadingAnswer && (
          <JsonVisualizer data={analysisResult} />
        )}

        <Divider flexItem sx={{ bgcolor: LIGHT_BLUE, mx: 4, mt: 10 }} />
      </Box>
    </Box>
  );
}

function UploadPdfContext({ setDocumentTitle, setBase64File, setFileUrl }) {
  function extractTextFromPDF(e) {
    const file = e.target.files[0];
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed!");
      return;
    }
    setDocumentTitle(file.name);

    var reader = new FileReader();
    reader.readAsDataURL(file);
    setFileUrl(URL.createObjectURL(file));
    reader.onload = function () {
      setBase64File(reader.result);
    };
    reader.onerror = function (error) {
      console.log("Error: ", error);
    };
  }

  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });

  return (
    <IconButton size="large" component="label" onChange={extractTextFromPDF}>
      <CloudUploadOutlinedIcon
        sx={{ width: 50, height: 50 }}
        fontSize="inherit"
      />
      <VisuallyHiddenInput type="file" />
    </IconButton>
  );
}
function JsonVisualizer({ data }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1500,
        mx: "auto",
        my: 4,
        px: { xs: 1, sm: 2 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          JSON Result
        </Typography>
      </Box>

      <Grid2 container spacing={3} alignItems="flex-start">
        <Grid2 size={{ xs: 12 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: (t) =>
                t.palette.mode === "dark" ? "background.paper" : "#f7faff",
              borderRadius: 2,
              boxShadow: (t) => (t.palette.mode === "dark" ? 0 : 1),
              position: { md: "sticky" },
              top: { md: 16 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                width: 1,
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary", mb: 1, letterSpacing: 0.3 }}
              >
                JSON
              </Typography>
              <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
                <IconButton onClick={handleCopy} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              component="pre"
              sx={{
                m: 0,
                fontSize: 13,
                lineHeight: 1.6,
                overflowX: "auto",
                maxHeight: 1000,
                overflowY: "auto",
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "grey.900" : "grey.50",
                border: (t) => `1px solid ${t.palette.divider}`,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </Box>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
}
