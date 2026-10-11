import ExcelJS from "exceljs";
import { FlowMeta } from "../model/viewModel";

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

export class ExcelExportService {
  static async exportFlowsToExcel(
    flows: FlowMeta[],
    columns: Array<{ field: string; headerName: string }>,
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = "flows_export.xlsx", sheetName = "Flows" } = options;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.headerName,
      key: col.field,
      width: 20,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF366092" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    flows.forEach((flow) => {
      const rowData: Record<string, string | undefined> = {};

      columns.forEach((col) => {
        if (col.field === "solutions") {
          rowData[col.field] = flow.solutions
            .map((sol) => `${sol.name} (${sol.uniqueName})`)
            .join("; ");
        } else if (col.field === "coOwners") {
          rowData[col.field] = flow.coOwners.map((owner) => owner.name).join("; ");
        } else {
          rowData[col.field] = String((flow as any)[col.field] || "");
        }
      });

      worksheet.addRow(rowData);
    });

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "top", wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
