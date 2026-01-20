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
  RowSelectionOptions,
  RowSelectionModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { FlowMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";

ModuleRegistry.registerModules([
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  ValidationModule,
  RowAutoHeightModule,
  RowSelectionModule,
]);

const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

interface FlowGridProps {
  vm: ViewModel;
  dvSvc: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const FlowGrid = observer((props: FlowGridProps): React.JSX.Element => {
  const { vm, dvSvc, onLog } = props;
  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);
  function rowSelected(_: SelectionChangedEvent<any>): void {}

  const cols: ColDef<FlowMeta>[] = [
    { field: "name", headerName: "Flow Name", minWidth: 200 },
    { field: "type", headerName: "Type", minWidth: 100 },
    { field: "category", headerName: "Category", minWidth: 100 },
    { field: "ownerId", headerName: "Owner ID", minWidth: 150 },
    { field: "description", headerName: "Description", minWidth: 250 },
    { field: "createdBy", headerName: "Created By", minWidth: 150 },
    { field: "state", headerName: "State", minWidth: 100 },
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
    console.log("Selected solution changed:", vm.selectedSolution);
    const fetchFlows = async () => {
      if (!vm.selectedSolution) {
        vm.flows = [];
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

  return (
    <div style={{ width: "100%", height: "85vh" }}>
      <AgGridReact<FlowMeta>
        suppressFieldDotNotation
        rowData={vm.flows}
        columnDefs={cols}
        theme={agTheme}
        domLayout="normal"
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
        onSelectionChanged={rowSelected}
      />
    </div>
  );
});
