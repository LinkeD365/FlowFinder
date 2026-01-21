import React from "react";

import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { Combobox, Option, Toolbar, ToolbarButton, ToolbarGroup, Tooltip } from "@fluentui/react-components";
import {
  FontIncrease24Regular,
  FontDecrease24Regular,
  TextFont24Regular,
  PeopleLockFilled,
  BoxRegular,
} from "@fluentui/react-icons";
import { FlowGrid } from "./flowGrid";
import { CoOwnersDrawer } from "./coOwnersDrawer";
import { SolutionsDrawer } from "./solutionsDrawer";

interface FlowFinderProps {
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export const FlowFinder = observer((props: FlowFinderProps): React.JSX.Element => {
  const { dvSvc, vm, onLog } = props;
  const [coownerOpen, SetCoownerOpen] = React.useState<boolean>(false);
  const [solutionOpen, SetSolutionOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchSolutions = async () => {
      try {
        const solutions = await dvSvc.getSolutions(false);
        vm.solutions = solutions;
        onLog(`Fetched ${solutions.length} solutions`, "success");
      } catch (error) {
        onLog(`Error fetching solutions: ${error}`, "error");
      }
    };
    fetchSolutions();
  }, [dvSvc, onLog]);

  const getAllFlows = async () => {
    try {
      const flows = await dvSvc.getFlowsBySolution();
      vm.flows = flows;
      onLog(`Fetched ${flows.length} flows`, "success");
    } catch (error) {
      onLog(`Error fetching flows: ${error}`, "error");
    }
  };

  const toolBar = (
    <Toolbar
      aria-label="Medium"
      size="medium"
      style={{ justifyContent: "space-between", zIndex: 10, position: "relative", marginBottom: 2 }}
    >
      <ToolbarGroup>
        <Combobox placeholder="Select a Solution" inlinePopup listbox={{ style: { zIndex: 20 } }}>
          {vm.solutions.map((solution) => (
            <Option
              key={solution.id}
              text={solution.name}
              onClick={() => {
                vm.selectedSolution = solution;
              }}
            >
              {solution.name}
            </Option>
          ))}
        </Combobox>
        <ToolbarButton icon={<FontDecrease24Regular />} aria-label="All Flows" onClick={getAllFlows}>
          All Flows
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton
          icon={<PeopleLockFilled />}
          onClick={() => SetCoownerOpen(true)}
          disabled={!vm.selectedFlows || vm.selectedFlows.length === 0}
        >
          Manage Co-Owners
        </ToolbarButton>
        <ToolbarButton icon={<BoxRegular />} onClick={() => SetSolutionOpen(true)} disabled={!vm.selectedFlows || vm.selectedFlows.length === 0}>
          Manage Solutions
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );

  return (
    <div>
      <div style={{ zIndex: 1 }}>{toolBar}</div>
      <div>
        <FlowGrid vm={vm} dvSvc={dvSvc} onLog={onLog} />
        {coownerOpen && (
          <CoOwnersDrawer
            dvSvc={dvSvc}
            vm={vm}
            drawerOpen={coownerOpen}
            closeDrawer={() => SetCoownerOpen(false)}
            onLog={onLog}
          />
        )}
        {solutionOpen && (
          <SolutionsDrawer
            dvSvc={dvSvc}
            vm={vm}
            drawerOpen={solutionOpen}
            closeDrawer={() => SetSolutionOpen(false)}
            onLog={onLog}
          />
        )}
      </div>
    </div>
  );
});
