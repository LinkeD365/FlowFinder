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
import ReactJsonView from "@microlink/react-json-view";
import { ViewModel } from "../model/viewModel";
import { observer } from "mobx-react";

interface JsonViewerProps {
  json: string;
  title?: string;
  vm: ViewModel;
}

export const JsonViewer = observer((props: JsonViewerProps): React.JSX.Element => {
  const { json, title = "JSON Viewer", vm } = props;
  const [open, setOpen] = React.useState(false);
  const [formattedJson, setFormattedJson] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const theme = vm?.theme || "light";
  
  // Memoize parsed JSON and parse error only when dialog is open
  const { jsonObj, parseError } = React.useMemo(() => {
    if (!json) {
      return { jsonObj: {}, parseError: "" };
    }
    if (!open) {
      return { jsonObj: {}, parseError: "" };
    }
    try {
      const parsed = JSON.parse(json);
      return { jsonObj: parsed, parseError: "" };
    } catch (err) {
      return { jsonObj: {}, parseError: "Invalid JSON format" };
    }
  }, [json, open]);

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

  const copyToClipboard = async () => {
    const textToCopy = formattedJson || json;

    if (!textToCopy) {
      setError("No JSON data available to copy");
      return;
    }

    // Use Clipboard API when available
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(textToCopy);
        // Clear any previous error on successful copy
        setError("");
      } catch {
        setError("Failed to copy to clipboard");
      }
      return;
    }

    // Fallback for environments without Clipboard API
    try {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!success) {
        setError("Failed to copy to clipboard");
      } else {
        setError("");
      }
    } catch {
      setError("Clipboard not supported in this environment");
    }
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
          <DialogContent style={{ overflow: "auto", height: "60vh" }}>
            {(error || parseError) && <div style={{ color: "red", marginBottom: "10px" }}>{error || parseError}</div>}
            <pre
              style={{
                backgroundColor: theme === "dark" ? "#1e1e1e" : "#f5f5f5",
                padding: "16px",
                borderRadius: "4px",
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.5",
                border: "1px solid #ddd",
              }}
            >
              <ReactJsonView
                src={jsonObj}
                name={false}
                collapsed={10}
                enableClipboard={false}
                displayDataTypes={false}
                theme={theme === "dark" ? "threezerotwofour" : "rjv-default"}
              />
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
});
