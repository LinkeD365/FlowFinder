import React from "react";

import { observer } from "mobx-react";
import { OwnerMeta, SolutionMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import {
  Button,
  Caption1,
  Caption2,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  List,
  ListItem,
} from "@fluentui/react-components";
import { Delete12Filled, Dismiss24Regular, PeopleTeam16Filled, Person12Filled } from "@fluentui/react-icons";
import { SearchBoxCtl } from "./SeachBox";
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
    if (vm.selectedFlows && vm.selectedFlows.length == 1) {
      await dvSvc
        .getFlowSolutions(vm.selectedFlows[0])
        .then((owners) => {
          setFlowSolutions(owners);
        })
        .catch((error) => {
          onLog(`Error fetching co-owners: ${error}`, "error");
          window.toolboxAPI.utils.showNotification({
            title: "Error fetching co-owners",
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
    console.log(`Solution selected: ${solution.name} (ID: ${solution.id})`);

    await dvSvc
      .addSolution(vm.selectedFlows![0], solution)
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
