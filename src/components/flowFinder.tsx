import React from "react";

import { observer } from "mobx-react";
import { FlowMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { Combobox, Option, SearchBox, tokens, Toolbar, ToolbarButton, ToolbarGroup } from "@fluentui/react-components";
import { PeopleLockFilled, BoxRegular } from "@fluentui/react-icons";
import { FlowGrid } from "./flowGrid";
import { FlowRunsGrid } from "./flowRunsGrid";
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
  const [runsFlow, setRunsFlow] = React.useState<FlowMeta | null>(null);
  const [solutionQuery, setSolutionQuery] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

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
      vm.selectedSolution = null;
      const flows = await dvSvc.getFlowsBySolution();
      vm.flows = flows;
      onLog(`Fetched ${flows.length} flows`, "success");
    } catch (error) {
      onLog(`Error fetching flows: ${error}`, "error");
    }
  };

  const normalizedSolutionQuery = solutionQuery.trim().toLocaleLowerCase();
  const filteredSolutions = vm.solutions.filter((solution) =>
    solution.name.toLocaleLowerCase().includes(normalizedSolutionQuery),
  );
  const showAllSolutions = "All Solutions".toLocaleLowerCase().includes(normalizedSolutionQuery);

  const toolBar = (
    <Toolbar
      aria-label="Medium"
      size="medium"
      style={{ justifyContent: "space-between", position: "relative", marginBottom: 2 }}
    >
      <ToolbarGroup>
        <Combobox
          placeholder="Select a Solution"
          inlinePopup
          listbox={{
            style: {
              zIndex: 1000,
              backgroundColor: tokens.colorNeutralBackground1,
              border: `1px solid ${tokens.colorNeutralStroke1}`,
              boxShadow: tokens.shadow16,
            },
          }}
          value={solutionQuery}
          onChange={(event) => setSolutionQuery(event.target.value)}
          onOptionSelect={(_, data) => {
            if (data.optionValue === "all-solutions") {
              setSolutionQuery("All Solutions");
              void getAllFlows();
              return;
            }

            const solution = vm.solutions.find((item) => item.id === data.optionValue);
            if (solution) {
              setSolutionQuery(solution.name);
              vm.selectedSolution = solution;
            }
          }}
        >
          {showAllSolutions && (
            <Option key="all-solutions" value="all-solutions" text="All Solutions">
              All Solutions
            </Option>
          )}
          {filteredSolutions.map((solution) => (
            <Option key={solution.id} value={solution.id} text={solution.name}>
              {solution.name}
            </Option>
          ))}
          {!showAllSolutions && filteredSolutions.length === 0 && <Option disabled>No matching solutions</Option>}
        </Combobox>
        <ToolbarButton aria-label="All Cloud Flows" onClick={getAllFlows}>
          All Cloud Flows
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <SearchBox
          placeholder="Search all..."
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          style={{ minWidth: "200px" }}
        />
        <ToolbarButton
          icon={<PeopleLockFilled />}
          onClick={() => SetCoownerOpen(true)}
          disabled={vm.selectedFlows?.length !== 1}
        >
          Manage Co-Owners
        </ToolbarButton>
        <ToolbarButton
          icon={<BoxRegular />}
          onClick={() => SetSolutionOpen(true)}
          disabled={vm.selectedFlows?.length !== 1}
        >
          Manage Solutions
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );

  const refreshGrid = async () => {
    if (!vm.selectedSolution) {
      await getAllFlows();
      return;
    }

    try {
      const flows = await dvSvc.getFlowsBySolution(vm.selectedSolution);
      vm.flows = flows;
      onLog(`Fetched ${flows.length} flows`, "success");
    } catch (error) {
      onLog(`Error fetching flows for selected solution: ${error}`, "error");
    }
  };

  if (runsFlow) {
    return <FlowRunsGrid flow={runsFlow} dvSvc={dvSvc} onBack={() => setRunsFlow(null)} onLog={onLog} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
      <div style={{ position: "relative", zIndex: 100, flexShrink: 0 }}>{toolBar}</div>
      <div style={{ position: "relative", zIndex: 0, flex: 1, minHeight: 0 }}>
        <FlowGrid
          vm={vm}
          dvSvc={dvSvc}
          onLog={onLog}
          onViewRuns={setRunsFlow}
          searchQuery={searchQuery}
        />
      </div>
      {coownerOpen && (
        <CoOwnersDrawer
          dvSvc={dvSvc}
          vm={vm}
          drawerOpen={coownerOpen}
          closeDrawer={() => SetCoownerOpen(false)}
          onLog={onLog}
          onChanged={refreshGrid}
        />
      )}
      {solutionOpen && (
        <SolutionsDrawer
          dvSvc={dvSvc}
          vm={vm}
          drawerOpen={solutionOpen}
          closeDrawer={() => SetSolutionOpen(false)}
          onLog={onLog}
          onChanged={refreshGrid}
        />
      )}
    </div>
  );
});
