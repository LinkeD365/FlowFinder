/**
 * Shared column configuration for grid and export
 * Ensures export and grid always display the same columns
 */

export interface ExportColumn {
  field: string;
  headerName: string;
}

/**
 * Export-safe columns definition - only includes fields that can be exported
 * Excludes rendered-only columns like Trigger (computed), Definition (JSON viewer)
 */
export const EXPORT_COLUMNS: ExportColumn[] = [
  { field: "name", headerName: "Flow Name" },
  { field: "description", headerName: "Description" },
  { field: "ownerName", headerName: "Primary Owner" },
  { field: "createdBy", headerName: "Created By" },
  { field: "state", headerName: "State" },
  { field: "solutions", headerName: "Solutions" },
  { field: "coOwners", headerName: "Co-Owners" },
  { field: "isManagedFlow", headerName: "Is Managed" },
];
