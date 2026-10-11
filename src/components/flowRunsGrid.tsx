import React from "react";
import {
  BodyScrollEndEvent,
  CellStyleModule,
  ClientSideRowModelModule,
  ColDef,
  DateFilterModule,
  ICellRendererParams,
  ModuleRegistry,
  QuickFilterModule,
  RowApiModule,
  TextFilterModule,
  themeQuartz,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  Button,
  Caption1,
  makeStyles,
  MessageBar,
  MessageBarBody,
  SearchBox,
  Title2,
  tokens,
} from "@fluentui/react-components";
import { ArrowClockwise16Regular, ArrowLeft16Regular, Open16Regular } from "@fluentui/react-icons";
import { FlowMeta } from "../model/viewModel";
import { dvService, FlowRunRecord } from "../services/dataverseService";

ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  DateFilterModule,
  QuickFilterModule,
  RowApiModule,
  TextFilterModule,
]);

const runsTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    minHeight: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flex: 1,
  },
  flowName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  message: {
    margin: tokens.spacingHorizontalM,
    marginBottom: 0,
  },
  grid: {
    flex: 1,
    minHeight: 0,
  },
  pagingStatus: {
    minHeight: "28px",
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForeground3,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

interface FlowRun {
  id: string;
  partitionId: string;
  status: string;
  startTime: Date | null;
  startTimeDisplay: string;
  endTime: Date | null;
  endTimeDisplay: string;
  duration: string;
  trigger: string;
  error: string;
}

interface FlowRunsGridProps {
  flow: FlowMeta;
  dvSvc: dvService;
  onBack: () => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

const formatDuration = (startTime: Date | null, endTime: Date | null): string => {
  if (!startTime || !endTime) {
    return "";
  }

  const milliseconds = endTime.getTime() - startTime.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getFormattedValue = (run: FlowRunRecord, field: string): string => {
  const formattedValue = run[`${field}@OData.Community.Display.V1.FormattedValue`];
  const value = formattedValue ?? run[field];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const getRawValue = (run: FlowRunRecord, field: string): string => {
  const value = run[field];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const parseDateTime = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toFlowRun = (run: FlowRunRecord, index: number): FlowRun => {
  const startTime = parseDateTime(getRawValue(run, "starttime"));
  const endTime = parseDateTime(getRawValue(run, "endtime"));

  return {
    id: getFormattedValue(run, "flowrunid") || `run-${index}`,
    partitionId: getRawValue(run, "partitionid"),
    status: getFormattedValue(run, "status") || "Unknown",
    startTime,
    startTimeDisplay: getFormattedValue(run, "starttime"),
    endTime,
    endTimeDisplay: getFormattedValue(run, "endtime"),
    duration: getFormattedValue(run, "duration") || formatDuration(startTime, endTime),
    trigger: getFormattedValue(run, "triggertype"),
    error: getFormattedValue(run, "errormessage") || getFormattedValue(run, "errorcode"),
  };
};

const formatDateTime = (value: Date | null | undefined, formattedValue?: string): string => {
  if (formattedValue) return formattedValue;
  if (!value) return "";
  return value.toLocaleString();
};

export const FlowRunsGrid = (props: FlowRunsGridProps): React.JSX.Element => {
  const { flow, dvSvc, onBack, onLog } = props;
  const styles = useStyles();
  const [runs, setRuns] = React.useState<FlowRun[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const nextPageRef = React.useRef(2);
  const pagingCookieRef = React.useRef<string>();
  const loadingMoreRef = React.useRef(false);
  const requestGenerationRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    const requestGeneration = ++requestGenerationRef.current;

    const fetchRuns = async () => {
      setIsLoading(true);
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
      setHasMore(false);
      setError("");
      nextPageRef.current = 2;
      pagingCookieRef.current = undefined;

      try {
        const response = await dvSvc.getFlowRuns(flow, 1);
        const flowRuns = response.records.map(toFlowRun);

        if (!cancelled && requestGeneration === requestGenerationRef.current) {
          setRuns(flowRuns);
          pagingCookieRef.current = response.pagingCookie;
          setHasMore(Boolean(response.pagingCookie));
          onLog(`Fetched ${flowRuns.length} runs for ${flow.name}`, "success");
        }
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
        if (!cancelled) {
          setRuns([]);
          setError(message);
          onLog(`Error fetching runs for ${flow.name}: ${message}`, "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchRuns();
    return () => {
      cancelled = true;
    };
  }, [dvSvc, flow, onLog, refreshKey]);

  const loadMoreRuns = React.useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !pagingCookieRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setError("");
    const requestGeneration = requestGenerationRef.current;
    const page = nextPageRef.current;

    try {
      const response = await dvSvc.getFlowRuns(flow, page, pagingCookieRef.current);
      const pageRuns = response.records.map((run, index) => toFlowRun(run, (page - 1) * 500 + index));

      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setRuns((currentRuns) => {
        const existingIds = new Set(currentRuns.map((run) => run.id));
        return currentRuns.concat(pageRuns.filter((run) => !existingIds.has(run.id)));
      });
      nextPageRef.current = page + 1;
      pagingCookieRef.current = response.pagingCookie;
      setHasMore(Boolean(response.pagingCookie));
      onLog(`Fetched ${pageRuns.length} more runs for ${flow.name}`, "success");
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (requestGeneration === requestGenerationRef.current) {
        setError(message);
        onLog(`Error fetching more runs for ${flow.name}: ${message}`, "error");
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [dvSvc, flow, hasMore, onLog]);

  const handleBodyScrollEnd = React.useCallback(
    (event: BodyScrollEndEvent<FlowRun>) => {
      if (event.direction !== "vertical") {
        return;
      }

      const displayedRowCount = event.api.getDisplayedRowCount();
      if (displayedRowCount > 0 && event.api.getLastDisplayedRowIndex() >= displayedRowCount - 5) {
        void loadMoreRuns();
      }
    },
    [loadMoreRuns],
  );

  const openRun = React.useCallback(
    async (run: FlowRun) => {
      if (!run.partitionId) {
        onLog("Unable to open flow run: partition ID is unavailable", "error");
        return;
      }

      try {
        const environmentId = await dvSvc.getEnvironmentId();
        const runUrl = `https://make.powerautomate.com/environments/${encodeURIComponent(environmentId)}/flows/${encodeURIComponent(flow.id)}/runs/${encodeURIComponent(run.partitionId)}`;
        await window.toolboxAPI.utils.openInConnectionBrowser(runUrl);
      } catch (openError) {
        const message = openError instanceof Error ? openError.message : String(openError);
        onLog(`Error opening flow run: ${message}`, "error");
      }
    },
    [dvSvc, flow.id, onLog],
  );

  const columns = React.useMemo<ColDef<FlowRun>[]>(
    () => [
      {
        headerName: "Open",
        filter: false,
        sortable: false,
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        suppressSizeToFit: true,
        getQuickFilterText: () => "",
        cellRenderer: (params: ICellRendererParams<FlowRun>) => (
          <Button
            appearance="subtle"
            aria-label="Open flow run in browser"
            title="Open flow run in browser"
            icon={<Open16Regular />}
            size="small"
            disabled={!params.data?.partitionId}
            onClick={() => params.data && void openRun(params.data)}
          />
        ),
      },
      { field: "status", headerName: "Status", minWidth: 120 },
      {
        field: "startTime",
        headerName: "Started",
        minWidth: 190,
        cellDataType: "dateTime",
        initialSort: "desc",
        valueFormatter: (params) => formatDateTime(params.value, params.data?.startTimeDisplay),
        getQuickFilterText: (params) => formatDateTime(params.value, params.data?.startTimeDisplay),
      },
      {
        field: "endTime",
        headerName: "Finished",
        minWidth: 190,
        cellDataType: "dateTime",
        valueFormatter: (params) => formatDateTime(params.value, params.data?.endTimeDisplay),
        getQuickFilterText: (params) => formatDateTime(params.value, params.data?.endTimeDisplay),
      },
      { field: "duration", headerName: "Duration", minWidth: 110 },
      { field: "trigger", headerName: "Trigger", minWidth: 160, flex: 1 },
      {
        field: "error",
        headerName: "Error",
        minWidth: 220,
        flex: 2,
        cellStyle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      },
      {
        field: "id",
        headerName: "Run ID",
        minWidth: 260,
        flex: 1,
        cellStyle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      },
    ],
    [openRun],
  );

  const defaultColumn = React.useMemo<ColDef<FlowRun>>(
    () => ({ sortable: true, filter: true, resizable: true }),
    [],
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Button appearance="subtle" icon={<ArrowLeft16Regular />} onClick={onBack}>
          Flows
        </Button>
        <div className={styles.heading}>
          <Title2>Flow runs</Title2>
          <Caption1 className={styles.flowName} title={flow.name}>
            {flow.name}
          </Caption1>
        </div>
        <div className={styles.actions}>
          <SearchBox
            aria-label="Filter flow runs"
            placeholder="Filter runs..."
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
          />
          <Button
            appearance="subtle"
            icon={<ArrowClockwise16Regular />}
            disabled={isLoading}
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Refresh
          </Button>
        </div>
      </header>
      {error && (
        <MessageBar className={styles.message} intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      <div className={styles.grid}>
        <AgGridReact<FlowRun>
          rowData={runs}
          columnDefs={columns}
          defaultColDef={defaultColumn}
          theme={runsTheme}
          loading={isLoading}
          quickFilterText={searchQuery}
          getRowId={(params) => params.data.id}
          onBodyScrollEnd={handleBodyScrollEnd}
          noRowsOverlayComponent={() => <Caption1>No flow runs found</Caption1>}
        />
      </div>
      <Caption1 className={styles.pagingStatus}>
        {isLoadingMore ? "Loading more runs..." : hasMore ? "Scroll for more runs" : `${runs.length} runs loaded`}
      </Caption1>
    </div>
  );
};