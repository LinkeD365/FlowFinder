import React from "react";
import { observer } from "mobx-react";
import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
  ValidationModule,
  RowAutoHeightModule,
  RowApiModule,
  RowSelectionOptions,
  RowSelectionModule,
  SelectionChangedEvent,
  GetRowIdParams,
  QuickFilterModule,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { FlowMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { PeopleTeam16Filled, Person16Filled } from "@fluentui/react-icons";
import { JsonViewer } from "./jsonViewer";
import { Caption1 } from "@fluentui/react-components";

ModuleRegistry.registerModules([
  RowApiModule,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  ValidationModule,
  RowAutoHeightModule,
  RowSelectionModule,
  QuickFilterModule,
]);

const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

interface FlowGridProps {
  vm: ViewModel;
  dvSvc: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  searchQuery?: string;
}

export const FlowGrid = observer((props: FlowGridProps): React.JSX.Element => {
  const { vm, dvSvc, onLog, searchQuery } = props;
  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "singleRow",
    };
  }, []);
  const gridRef = React.useRef<AgGridReact>(null);

  // Apply quick filter when search query changes
  React.useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption("quickFilterText", searchQuery || "");
    }
  }, [searchQuery]);

  const cols: ColDef<FlowMeta>[] = [
    { field: "name", headerName: "Flow Name", minWidth: 200, flex: 2 },
    { field: "description", headerName: "Description", minWidth: 250, autoHeight: true, flex: 2 },

    { field: "ownerName", headerName: "Primary Owner", minWidth: 150 },
    { field: "createdBy", headerName: "Created By", minWidth: 150 },
    { field: "state", headerName: "State", minWidth: 100 },
    {
      headerName: "Trigger",
      minWidth: 180,
      valueGetter: (params) => params.data?.getTriggerText() || "",
      getQuickFilterText: (params) => params.data?.getTriggerText() || "",
    },
    {
      headerName: "Solutions",
      field: "solutions",
      filter: false,
      cellRenderer: (params: CustomCellRendererProps<FlowMeta>) => {
        return <>{params.data?.solutions.map((sol) => sol.name).join(", ") ?? ""}</>;
      },
    },
    {
      headerName: "Co-Owners",
      field: "coOwners",
      cellRenderer: (params: CustomCellRendererProps<FlowMeta>) => {
        return (
          <>
            {params.data?.coOwners.map((owner) => (
              <div
                style={{ overflow: "hidden", display: "flex", flexDirection: "row", alignItems: "center" }}
                key={owner.id}
              >
                {owner.type === "user" ? <Person16Filled /> : <PeopleTeam16Filled />}{" "}
                <div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginLeft: 4 }}>
                  &nbsp;
                  {owner.name}
                </div>
              </div>
            )) ?? ""}
          </>
        );
      },
    },
    {
      headerName: "Is Managed",
      filter: false,
      cellRenderer: (params: CustomCellRendererProps<FlowMeta>) => {
        return <>{params.data?.solutions.some((sol) => sol.managed) ? "Yes" : "No"}</>;
      },
    },
    {
      headerName: "Definition",
      filter: false,
      minWidth: 150,
      getQuickFilterText: () => "",
      cellRenderer: (params: CustomCellRendererProps<FlowMeta>) => {
        return (
          <JsonViewer
            json={params.data?.flowDefinition || ""}
            title={`Flow Definition: ${params.data?.name || ""}`}
            vm={vm}
          />
        );
      },
    },
  ];
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    wrapText: true,
    width: 100,
  };

  React.useEffect(() => {
    let cancelled = false;

    const fetchFlowDetails = async () => {
      // Take a snapshot of the current flows to avoid issues if vm.flows mutates while we fetch.
      const flowsSnapshot = [...vm.flows];

      await Promise.all(
        flowsSnapshot.map(async (flow) => {
          try {
            const [solutions, owners] = await Promise.all([dvSvc.getFlowSolutions(flow), dvSvc.getCoOwners(flow)]);

            if (cancelled) {
              return;
            }

            flow.solutions = solutions;
            flow.coOwners = owners;

            if (gridRef.current) {
              const rowNode = gridRef.current.api.getRowNode(flow.id);
              rowNode?.setData(flow);
            }
          } catch (error) {
            console.error(`Error fetching details for flow ${flow.id}:`, error);
          }
        }),
      );
    };

    if (vm.flows && vm.flows.length > 0) {
      fetchFlowDetails();
    }

    return () => {
      cancelled = true;
    };
  }, [vm.flows]);

  const NoRowsOverlay = () => <Caption1>No flows available</Caption1>;
  React.useEffect(() => {
    const fetchFlows = async () => {
      if (!vm.selectedSolution) {
        // Clear flows (and any selected flows) when no solution is selected to avoid stale data in the grid.
        vm.flows = [];
        if (vm.selectedFlows) {
          vm.selectedFlows = [];
        }
        return;
      }
      try {
        await dvSvc.getFlowsBySolution(vm.selectedSolution).then((flows) => {
          vm.flows = flows;
        });
      } catch (error) {
        console.error("Error fetching flows:", error);
        onLog(`Error fetching flows: ${error}`, "error");
      }
    };
    fetchFlows();
  }, [vm.selectedSolution]);
  const getRowId = React.useCallback((params: GetRowIdParams<FlowMeta>) => {
    return params.data.id;
  }, []);
  function rowSelected(_: SelectionChangedEvent<any>): void {
    const selectedRows = _.api.getSelectedRows() as FlowMeta[];
    vm.selectedFlows = selectedRows;
    onLog(`Selected ${selectedRows.length} flows`, "info");
  }
  return (
    <div style={{ width: "100%", height: "85vh" }}>
      <AgGridReact<FlowMeta>
        ref={gridRef}
        suppressFieldDotNotation
        rowData={vm.flows}
        columnDefs={cols}
        theme={agTheme}
        domLayout="normal"
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
        getRowId={getRowId}
        onSelectionChanged={rowSelected}
        noRowsOverlayComponent={NoRowsOverlay}
      />
    </div>
  );
});
