import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
} from "@fluentui/react-components";
import { Code16Regular } from "@fluentui/react-icons";

interface JsonViewerProps {
  json: string;
  title?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ json, title = "JSON Viewer" }) => {
  const [open, setOpen] = React.useState(false);
  const [formattedJson, setFormattedJson] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const formatJson = () => {
    try {
      if (!json) {
        setError("No JSON data available");
        return;
      }
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      setFormattedJson(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (err) {
      setError("Invalid JSON format");
      setFormattedJson(json || "");
    }
  };

  const handleOpen = () => {
    formatJson();
    setOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson || json);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<Code16Regular />} size="small" onClick={handleOpen} disabled={!json}>
          View JSON
        </Button>
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: "80vw", maxHeight: "80vh" }}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent style={{ overflow: "auto", maxHeight: "60vh" }}>
            {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "16px",
                borderRadius: "4px",
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.5",
                border: "1px solid #ddd",
              }}
            >
              {formattedJson || json}
            </pre>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={copyToClipboard}>
              Copy to Clipboard
            </Button>
            <Button appearance="primary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
