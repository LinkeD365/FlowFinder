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
    if (!this.connection) {
      throw new Error("No connection available");
    }

    const solutionsData = await this.dvApi.queryData(
      "solutions?$filter=(isvisible eq true) and ismanaged eq " +
        (managed ? "true" : "false") +
        " and (friendlyname ne 'Default' and friendlyname ne 'Common Data Service Default Solution') &$select=friendlyname,uniquename,ismanaged&$orderby=createdon desc",
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

      // Note: Including clientdata in the query can significantly increase payload size
      // and impact initial load performance. Consider lazy-loading this data only when
      // the JSON viewer is opened for a specific flow if performance issues are observed.
      let fetchXml = [
        "<fetch>",
        "  <entity name='workflow'>",
        "    <attribute name='category'/>",
        "    <attribute name='name'/>",
        "    <attribute name='type'/>",
        "    <attribute name='ownerid'/>",
        "    <attribute name='description'/>",
        "    <attribute name='createdby'/>",
        "    <attribute name='statecode'/>",
        "    <attribute name='workflowid'/>",
        "     <attribute name='clientdata'/>",
        "    <order attribute='name' descending='false' />",
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
              flow.clientdata,
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
    this.onLog(`Fetching co-owners for flow: ${flow?.name}`, "info");
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        throw new Error("No connection available");
      }

      const fetchXml = `<fetch>
  <entity name="workflow">
    <filter>
      <condition attribute="workflowid" operator="eq" value="${flow.id}" />
    </filter>
    <link-entity name="principalobjectaccess" from="objectid" to="workflowid" alias="poa">
      <attribute name="principalid" />
      <filter>
        <condition attribute="accessrightsmask" operator="eq" value="852023" />
      </filter>
      <link-entity name="systemuser" from="systemuserid" to="principalid" link-type="outer" alias="u">
        <attribute name="fullname" />
      </link-entity>
      <link-entity name="team" from="teamid" to="principalid" link-type="outer" alias="t">
        <attribute name="name" />
      </link-entity>
    </link-entity>
  </entity>
</fetch>`;

      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((response: any) => {
          const owners = (response.value as any[]).map((record: any) => {
            const ownerMeta = new OwnerMeta(
              record["u.fullname"] || record["t.name"],
              record["poa.principalid"],
              record["u.fullname"] ? "user" : "team",
            );
            return ownerMeta;
          });
          resolve(owners.filter((o) => o.id != flow.ownerId)); // Filter out the primary owner
        })
        .catch((error) => {
          this.onLog(`Error fetching co-owners: ${error}`, "error");
          reject(error);
        });
    });
  }

  async getUsers(search: string): Promise<OwnerMeta[]> {
    return new Promise<OwnerMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No connection available"));
      }
      const escapedSearch = search.replace(/'/g, "''");
      this.dvApi
        .queryData(`systemusers?$filter=contains(fullname,'${escapedSearch}')&$select=fullname,systemuserid&$top=10`)
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
      const escapedSearch = search.replace(/'/g, "''");
      this.dvApi
        .queryData(`teams?$filter=contains(name,'${escapedSearch}')&$select=name,teamid&$top=10`)
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
      const escapedSearch = search.replace(/'/g, "''");
      this.dvApi
        .queryData(
          `solutions?$filter=ismanaged eq false and (contains(friendlyname,'${escapedSearch}') or contains(uniquename,'${escapedSearch}'))&$select=friendlyname,uniquename,solutionid,ismanaged&$top=20`,
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
      <condition attribute="uniquename" operator="ne" value="Active" />
    </filter>
    <link-entity name="solutioncomponent" from="solutionid" to="solutionid" alias="sc">
      <filter>
        <condition attribute="objectid" operator="eq" value="{RECORD-ID}" />
      </filter> 
    </link-entity>
  </entity>
</fetch>`.replace("{RECORD-ID}", flow.id);
      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((solutionsData) => {
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
