import { FlowMeta, OwnerMeta, SolutionMeta } from "../model/viewModel";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  batchSize = 2;
  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  async getSolutions(managed: boolean): Promise<SolutionMeta[]> {
    this.onLog("Fetching solutions...", "info");
    console.log("Fetching solutions, connection: ", this.connection);
    if (!this.connection) {
      throw new Error("No connection available");
    }

    const solutionsData = await this.dvApi.queryData(
      "solutions?$filter=(isvisible eq true) and ismanaged eq " +
        (managed ? "true" : "false") +
        " &$select=friendlyname,uniquename,ismanaged&$orderby=createdon desc",
    );
    const solutions: SolutionMeta[] = (solutionsData.value as any[]).map((sol: any) => {
      const solution = new SolutionMeta(sol.friendlyname, sol.uniquename, sol.solutionid, sol.ismanaged);
      return solution;
    });

    return solutions;
  }

  async getFlowsBySolution(solution?: SolutionMeta): Promise<FlowMeta[]> {
    this.onLog(`Fetching flows for solution: ${solution?.name ?? "All Solutions"}`, "info");
    return new Promise<FlowMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        throw new Error("No connection available");
      }

      let fetchXml = [
        "<fetch top='50'>",
        "  <entity name='workflow'>",
        "    <attribute name='category'/>",
        "    <attribute name='name'/>",
        "    <attribute name='type'/>",
        "    <attribute name='ownerid'/>",
        "    <attribute name='description'/>",
        "    <attribute name='createdby'/>",
        "    <attribute name='statecode'/>",
        "    <attribute name='workflowid'/>",
        "    <filter>",
        "      <condition attribute='type' operator='eq' value='1'/>",
        "      <condition attribute='category' operator='eq' value='5'/>",
        "    </filter>",
      ].join("");
      if (solution) {
        fetchXml += [
          "    <link-entity name='solutioncomponent' from='objectid' to='workflowid' alias='sc'>",
          "      <filter>",
          "        <condition attribute='solutionid' operator='eq' value='",
          solution.id,
          "'/>",
          "      </filter>",
          "    </link-entity>",
          "  </entity>",
          "</fetch>",
        ].join("");
      } else {
        fetchXml += ["  </entity>", "</fetch>"].join("");
      }
      //const url = `workflows?$filter=(solutionid eq ${solution.id})&$select=name,workflowid,ownerid,type,category,description,createdby,statecode&$orderby=createdon desc`;
      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((flowsData) => {
          console.log("Fetched flows data: ", flowsData);
          const flows: FlowMeta[] = (flowsData.value as any[]).map((flow: any) => {
            const flowMeta = new FlowMeta(
              flow.name,
              flow.workflowid,
              flow["_ownerid_value@OData.Community.Display.V1.FormattedValue"],
              flow["_ownerid_value"],
              flow.type,
              flow.category,
              flow.description,
              flow["_createdby_value@OData.Community.Display.V1.FormattedValue"],
              flow["statecode@OData.Community.Display.V1.FormattedValue"],
            );
            return flowMeta;
          });
          resolve(flows);
        })
        .catch((error) => {
          this.onLog(`Error fetching flows: ${error}`, "error");
          reject(error);
        });
    });
  }

  async getCoOwners(flow: FlowMeta): Promise<OwnerMeta[]> {
    this.onLog(`Fetching flows for solution: ${flow?.name ?? "All Solutions"}`, "info");
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        throw new Error("No connection available");
      }

      let fetchXml = `<fetch>
  <entity name="principalobjectaccess">
    <attribute name="objectid" />
    <attribute name="accessrightsmask" />
    <attribute name="principalid" />
    <link-entity name="systemuser" from="systemuserid" to="principalid" link-type="outer" alias="u">
      <attribute name="fullname" alias="user" />
    </link-entity>
    <link-entity name="team" from="teamid" to="principalid" link-type="outer" alias="t">
      <attribute name="name" alias="team" />
    </link-entity>
    <filter>
      <condition attribute="objectid" operator="eq" value="{RECORD-ID}" />
      <condition attribute="accessrightsmask" operator="eq" value="852023" /> // owner
    </filter>
  </entity>
</fetch>`.replace("{RECORD-ID}", flow.id);
      console.log("FetchXML for co-owners: ", fetchXml);
      //const url = `workflows?$filter=(solutionid eq ${solution.id})&$select=name,workflowid,ownerid,type,category,description,createdby,statecode&$orderby=createdon desc`;
      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((ownersData) => {
          const owners = (ownersData.value as any[]).map((owner: any) => {
            const ownerMeta = new OwnerMeta(
              owner["user"] || owner["team"],
              owner["principalid"],
              owner["user"] ? "user" : "team",
            );
            return ownerMeta;
          });
          resolve(owners.filter((o) => o.id != flow.ownerId)); // Filter out any undefined IDs
        })
        .catch((error) => {
          this.onLog(`Error fetching flows: ${error}`, "error");
          reject(error);
        });
    });
  }

  async getUsers(search: string): Promise<OwnerMeta[]> {
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      console.log(`systemusers?$filter=contains(fullname,'${search}')&$select=fullname,systemuserid&$top=10`);
      this.dvApi
        .queryData(`systemusers?$filter=contains(fullname,'${search}')&$select=fullname,systemuserid&$top=10`)
        .then((data: any) => {
          const users: OwnerMeta[] = (data.value as any[]).map((user: any) => {
            const owner = new OwnerMeta(user.fullname, user.systemuserid, "user");
            return owner;
          });
          resolve(users);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async getTeams(search: string): Promise<OwnerMeta[]> {
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      this.dvApi
        .queryData(`teams?$filter=contains(name,'${search}')&$select=name,teamid&$top=10`)
        .then((data: any) => {
          const teams: OwnerMeta[] = (data.value as any[]).map((team: any) => {
            const owner = new OwnerMeta(team.name, team.teamid, "team");
            return owner;
          });
          resolve(teams);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async getUsersAndTeams(search: string): Promise<OwnerMeta[]> {
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      const [usersData, teamsData] = await Promise.all([this.getUsers(search), this.getTeams(search)]);
      resolve(usersData.concat(teamsData));
    });
  }

  async searchSolutions(search: string): Promise<SolutionMeta[]> {
    return new Promise<SolutionMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      this.dvApi
        .queryData(
          `solutions?$filter=ismanaged eq false and (contains(friendlyname,'${search}') or contains(uniquename,'${search}'))&$select=friendlyname,uniquename,solutionid,ismanaged&$top=20`,
        )
        .then((data: any) => {
          const solutions: SolutionMeta[] = (data.value as any[])
            .filter((sol: any) => sol.uniquename !== "Default")
            .map((sol: any) => {
              const solution = new SolutionMeta(sol.friendlyname, sol.uniquename, sol.solutionid, sol.ismanaged);
              return solution;
            });
          resolve(solutions);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async addCoOwner(flow: FlowMeta, owner: OwnerMeta): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      const grantPayload = {
        Target: { workflowid: flow.id, "@odata.type": "Microsoft.Dynamics.CRM.workflow" },
        PrincipalAccess: {
          AccessMask:
            "ReadAccess, WriteAccess, AppendAccess, AppendToAccess, CreateAccess, DeleteAccess, ShareAccess, AssignAccess",
          Principal: {
            ownerid: owner.id,
            "@odata.type": owner.type === "user" ? "Microsoft.Dynamics.CRM.systemuser" : "Microsoft.Dynamics.CRM.team",
          },
        },
      };
      const request: DataverseAPI.ExecuteRequest = {
        operationName: "GrantAccess",
        operationType: "action",
        parameters: grantPayload,
      };
      await this.dvApi
        .execute(request)
        .then(() => {
          resolve();
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }

  async removeCoOwner(flow: FlowMeta, owner: OwnerMeta): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      const revokePayload = {
        Target: { workflowid: flow.id, "@odata.type": "Microsoft.Dynamics.CRM.workflow" },
        Revokee: {
          ownerid: owner.id,
          "@odata.type": owner.type === "user" ? "Microsoft.Dynamics.CRM.systemuser" : "Microsoft.Dynamics.CRM.team",
        },
      };
      const request: DataverseAPI.ExecuteRequest = {
        operationName: "RevokeAccess",
        operationType: "action",
        parameters: revokePayload,
      };
      await this.dvApi
        .execute(request)
        .then(() => {
          resolve();
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }

  async getFlowSolutions(flow: FlowMeta): Promise<SolutionMeta[]> {
    this.onLog(`Fetching solutions for flow: ${flow?.name ?? "All Flows"}`, "info");
    return new Promise<SolutionMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      let fetchXml = `<fetch>
  <entity name="solution">
    <attribute name="friendlyname" />
    <attribute name="uniquename" />
    <attribute name="solutionid" />
    <attribute name="ismanaged" />
    <filter>
      <condition attribute="uniquename" operator="ne" value="Default" />
    </filter>
    <link-entity name="solutioncomponent" from="solutionid" to="solutionid" alias="sc">
      <filter>
        <condition attribute="objectid" operator="eq" value="{RECORD-ID}" />
      </filter> 
    </link-entity>
  </entity>
</fetch>`.replace("{RECORD-ID}", flow.id);
      console.log("FetchXML for flow solutions: ", fetchXml);
      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((solutionsData) => {
          console.log("Fetched flow solutions data: ", solutionsData);
          const solutions: SolutionMeta[] = (solutionsData.value as any[]).map((sol: any) => {
            const solution = new SolutionMeta(sol.friendlyname, sol.uniquename, sol.solutionid, sol.ismanaged);
            return solution;
          });
          resolve(solutions);
        })
        .catch((error) => {
          this.onLog(`Error fetching flow solutions: ${error}`, "error");
          reject(error);
        });
    });
  }

  async addSolution(flow: FlowMeta, solution: SolutionMeta): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }

      const addToSolutionpayload = {
        SolutionUniqueName: solution.uniqueName,
        ComponentType: 29, // Workflow component type
        ComponentId: flow.id,
        AddRequiredComponents: false,
      };

      console.log("Add to solution payload: ", addToSolutionpayload);

      const request: DataverseAPI.ExecuteRequest = {
        operationName: "AddSolutionComponent",
        operationType: "action",
        parameters: addToSolutionpayload,
      };
      await this.dvApi
        .execute(request)
        .then(() => {
          resolve();
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }

  async removeSolution(flow: FlowMeta, solution: SolutionMeta): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      const removeFromSolutionpayload = {
        SolutionUniqueName: solution.uniqueName,
        ComponentType: 29, // Workflow component type
        SolutionComponent: { solutioncomponentid: flow.id },
      };
      const request: DataverseAPI.ExecuteRequest = {
        operationName: "RemoveSolutionComponent",
        operationType: "action",
        parameters: removeFromSolutionpayload,
      };
      console.log("Remove from solution payload: ", request);
      await this.dvApi
        .execute(request)
        .then(() => {
          resolve();
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }
}
