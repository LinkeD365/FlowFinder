import React from "react";

import { observer } from "mobx-react";
import { OwnerMeta, ViewModel } from "../model/viewModel";
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

interface CoOwnersDrawerProps {
  dvSvc: dvService;
  vm: ViewModel;
  drawerOpen: boolean;
  closeDrawer: () => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export const CoOwnersDrawer = observer((props: CoOwnersDrawerProps): React.JSX.Element => {
  const { dvSvc, vm, drawerOpen, closeDrawer, onLog } = props;
  const fetchCoOwners = async () => {
    if (vm.selectedFlows && vm.selectedFlows.length == 1) {
      onLog(`Co-Owners Drawer opened for flow: ${vm.selectedFlows[0].name}`, "info");
      await dvSvc
        .getCoOwners(vm.selectedFlows[0])
        .then((owners) => {
          vm.coOwners = owners;
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
    fetchCoOwners();
    // You can add any initialization logic here if needed
  }, [vm.selectedFlows]);

  const ownerSelected = async (owner: OwnerMeta) => {
    console.log(`Owner selected: ${owner.name} (ID: ${owner.id})`);

    await dvSvc
      .addCoOwner(vm.selectedFlows![0], owner)
      .then(async () => {
        onLog(`Added co-owner: ${owner.name}`, "success");
        window.toolboxAPI.utils.showNotification({
          title: "Co-Owner Added",
          body: `Successfully added co-owner: ${owner.name} to flow`,
          type: "success",
        });
        await fetchCoOwners();
      })
      .catch((error) => {
        onLog(`Error adding co-owner: ${error}`, "error");
        window.toolboxAPI.utils.showNotification({
          title: "Error adding co-owner",
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
            Co-Owners
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <SearchBoxCtl dvSvc={dvSvc} vm={vm} updateSelected={ownerSelected} onLog={onLog} />
          <List>
            {vm.coOwners.map((owner) => (
              <ListItem key={owner.id} value={owner.id}>
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
                    {owner.type === "user" ? <Person12Filled /> : <PeopleTeam16Filled />}
                    <Caption1 style={{ overflow: "hidden", textOverflow: "ellipsis", marginLeft: "8px" }}>
                      {owner.name}
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
