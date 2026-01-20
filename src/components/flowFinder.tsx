import React from "react";

import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { Combobox, Option, Toolbar, ToolbarButton } from "@fluentui/react-components";
import { FontIncrease24Regular, FontDecrease24Regular, TextFont24Regular } from "@fluentui/react-icons";
import { FlowGrid } from "./flowGrid";

interface FlowFinderProps {
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export const FlowFinder = observer((props: FlowFinderProps): React.JSX.Element => {
  const { dvSvc, vm, onLog } = props;

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

  const toolBar = (
    <Toolbar aria-label="Medium" size="medium">
      <Combobox placeholder="Select a Solution" inlinePopup>
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
    </Toolbar>
  );

  return <div>{toolBar}
  <FlowGrid vm={vm} dvSvc={dvSvc} onLog={onLog} /></div>;
});
