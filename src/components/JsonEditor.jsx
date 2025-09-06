import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

export default function JsonEditor({
  initialValue = `{
  "documents": [
    {
      "documentType": "string", 
      "metadata": {
        "title": "string",
        "date": "YYYY-MM-DD",
        "author": "string"
      },
      "content": [
        {
          "section": "string",
          "fields": {
            "fieldName": "value"
          }
        }
      ]
    }
  ]
}
`,

  autoFormatOnBlur = true,
  onValidJson,
}) {
  const initialText = useMemo(
    () =>
      typeof initialValue === "string"
        ? initialValue
        : JSON.stringify(initialValue, null, 2),
    [initialValue]
  );

  const [text, setText] = useState(initialText);
  const [error, setError] = useState(null);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(text);
      setError(null);
      return value;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return null;
    }
  }, [text]);

  useEffect(() => {
    if (parsed && !error) {
      onValidJson?.(parsed);
    }
  }, [parsed, error, onValidJson]);

  const handleFormat = () => {
    if (!error && parsed !== null) {
      setText(JSON.stringify(parsed, null, 2));
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 3, width: 0.8 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">Json Format</Typography>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (autoFormatOnBlur && !error && parsed !== null) {
              setText(JSON.stringify(parsed, null, 2));
            }
          }}
          multiline
          rows={16}
          placeholder="Paste or type JSON here"
          slotProps={{
            input: {
              sx: {
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 14,
              },
            },
          }}
          error={Boolean(error)}
          helperText={error ? `Invalid JSON: ${error}` : "Valid JSON"}
          fullWidth
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={handleFormat}
            disabled={Boolean(error)}
          >
            Autoformat
          </Button>
          <Button variant="outlined" onClick={() => setText(initialText)}>
            Reset
          </Button>
        </Stack>
        {parsed && !error && (
          <Alert severity="success" sx={{ mt: 1 }}>
            JSON parsed successfully.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Fix the JSON above. Tip: check commas, quotes, and matching braces.
          </Alert>
        )}
        <Divider />
      </Stack>
    </Paper>
  );
}
