import React from "react";

import { observer } from "mobx-react";
import { SolutionMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import {
  Button,
  Caption1,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  List,
  ListItem,
} from "@fluentui/react-components";
import { Delete12Filled, Dismiss24Regular } from "@fluentui/react-icons";
import { SearchSolution } from "./SeachSolutions";

interface SolutionsDrawerProps {
  dvSvc: dvService;
  vm: ViewModel;
  drawerOpen: boolean;
  closeDrawer: () => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export const SolutionsDrawer = observer((props: SolutionsDrawerProps): React.JSX.Element => {
  const { dvSvc, vm, drawerOpen, closeDrawer, onLog } = props;
  const [flowSolutions, setFlowSolutions] = React.useState<SolutionMeta[]>([]);
  const fetchSolutions = async () => {
    if (vm.selectedFlows && vm.selectedFlows.length === 1) {
      await dvSvc
        .getFlowSolutions(vm.selectedFlows[0])
        .then((solutions) => {
          setFlowSolutions(solutions);
        })
        .catch((error) => {
          onLog(`Error fetching solutions: ${error}`, "error");
          window.toolboxAPI.utils.showNotification({
            title: "Error fetching solutions",
            body: `${error}`,
            type: "error",
          });
        });
    }
  };
  React.useEffect(() => {
    fetchSolutions();
    // You can add any initialization logic here if needed
  }, [vm.selectedFlows]);

  const solutionSelected = async (solution: SolutionMeta) => {
    onLog(`Solution selected: ${solution.name} (ID: ${solution.id})`, "info");

    if (!vm.selectedFlows || vm.selectedFlows.length === 0) {
      onLog("No flow is currently selected. Cannot add solution.", "error");
      return;
    }

    const selectedFlow = vm.selectedFlows[0];

    await dvSvc
      .addSolution(selectedFlow, solution)
      .then(async () => {
        onLog(`Added solution: ${solution.name}`, "success");
        window.toolboxAPI.utils.showNotification({
          title: "Solution Added",
          body: `Successfully added solution: ${solution.name} to flow`,
          type: "success",
        });
        await fetchSolutions();
      })
      .catch((error) => {
        onLog(`Error adding solution: ${error}`, "error");
        window.toolboxAPI.utils.showNotification({
          title: "Error adding solution to Flow",
          body: `${error}`,
          type: "error",
        });
      });
  };
  const removeSolution = async (solution: SolutionMeta) => {
    onLog(`Removing solution: ${solution.name} (ID: ${solution.id})`, "info");

    const selectedFlow = vm.selectedFlows && vm.selectedFlows.length > 0 ? vm.selectedFlows[0] : undefined;
    if (!selectedFlow) {
      onLog("No flow selected when attempting to remove solution.", "error");
      return;
    }

    await dvSvc
      .removeSolution(selectedFlow, solution)
      .then(async () => {
        onLog(`Removed solution: ${solution.name}`, "success");
        window.toolboxAPI.utils.showNotification({
          title: "Solution Removed",
          body: `Successfully removed solution: ${solution.name} from flow`,
          type: "success",
        });
        await fetchSolutions();
      })
      .catch((error) => {
        onLog(`Error removing solution: ${error}`, "error");
        window.toolboxAPI.utils.showNotification({
          title: "Error removing solution from Flow",
          body: `${error}`,
          type: "error",
        });
      });
  };

  return (
    <div>
      <Drawer open={drawerOpen} onOpenChange={closeDrawer} position="end">
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss24Regular />}
                onClick={() => closeDrawer()}
              />
            }
          >
            Solutions
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <SearchSolution
            dvSvc={dvSvc}
            currentSolutions={flowSolutions}
            updateSelected={solutionSelected}
            onLog={onLog}
          />
          <List>
            {flowSolutions.map((solution) => (
              <ListItem key={solution.id} value={solution.id}>
                {" "}
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      border: "1px solid {token-color-border-neutral-weak}",
                      padding: "4px",
                      alignItems: "center",
                      width: "90%",
                      height: "32px",
                    }}
                  >
                    <Caption1 style={{ overflow: "hidden", textOverflow: "ellipsis", marginLeft: "8px" }}>
                      {solution.name}
                    </Caption1>
                  </div>
                  <Button
                    style={{ marginLeft: "auto" }}
                    icon={<Delete12Filled />}
                    appearance="subtle"
                    aria-label="Remove Co-Owner"
                    onClick={() => removeSolution(solution)}
                  ></Button>
                </div>
              </ListItem>
            ))}
          </List>
        </DrawerBody>
      </Drawer>
    </div>
  );
});
