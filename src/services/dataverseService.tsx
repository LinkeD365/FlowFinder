import { FlowMeta, SolutionMeta } from "../model/viewModel";

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
        " &$select=friendlyname,uniquename&$orderby=createdon desc",
    );
    const solutions: SolutionMeta[] = (solutionsData.value as any[]).map((sol: any) => {
      const solution = new SolutionMeta(sol.friendlyname, sol.uniquename, sol.solutionid);
      return solution;
    });

    return solutions;
  }

  async getFlowsBySolution(solution: SolutionMeta): Promise<FlowMeta[]> {
    this.onLog(`Fetching flows for solution: ${solution.name}`, "info");
    return new Promise<FlowMeta[]>(async (resolve, reject) => {
      if (!this.connection) {
        throw new Error("No connection available");
      }

      const fetchXml = [
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
      //const url = `workflows?$filter=(solutionid eq ${solution.id})&$select=name,workflowid,ownerid,type,category,description,createdby,statecode&$orderby=createdon desc`;
      await this.dvApi
        .fetchXmlQuery(fetchXml)
        .then((flowsData) => {
          const flows: FlowMeta[] = (flowsData.value as any[]).map((flow: any) => {
            const flowMeta = new FlowMeta(
              flow.name,
              flow.workflowid,
              flow.ownerid,
              flow.type,
              flow.category,
              flow.description,
              flow.createdby,
              flow.statecode,
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
}
