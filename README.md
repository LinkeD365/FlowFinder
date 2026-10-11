# FlowFinder

A Power Platform ToolBox tool to help you find, filter, and manage your Power Automate cloud flows at scale.

## Features

- 🔍 **View all Cloud Flows** - Display all cloud flows in your environment with detailed metadata
- 👥 **Owner Management** - See flow owners and co-owners at a glance; add or remove co-owners directly from the tool
- 📋 **Solution Management** - View which solution each flow belongs to; move flows between solutions
- 🏷️ **Advanced Filtering** - Filter flows by solution, owner, status, and other criteria
- 📊 **Flow Metadata** - View flow descriptions, creation dates, modification dates, and status
- 📖 **JSON Viewer** - Inspect the raw flow definition and client data in JSON format

## Requirements

- **Power Platform ToolBox** installed and configured
- **Active Dataverse connection** to your Power Platform environment
- **Permissions:**
  - Read access to `workflow` table (cloud flows)
  - Read access to `solution` table
  - Read/Write access to `workflow.ownerid` for managing co-owners
  - Read/Write access to `workflow.solutionid` for moving flows between solutions
- **Supported Browsers:** Chrome, Edge, Firefox (latest versions)
- **Power Automate Cloud Flows Only** - Applies to cloud flows (instant, automated, scheduled), not desktop flows/RPA

## Installation

1. Open Power Platform ToolBox
2. Navigate to the Tools or Marketplace section
3. Search for "FlowFinder"
4. Click **Install** to add the tool to your ToolBox
5. Open the tool from your ToolBox dashboard
6. Select your Dataverse connection when prompted

## Usage

### Finding Flows

1. **View all flows** - The grid loads all cloud flows from your environment on startup
2. **Search solutions** - Use the "Search Solutions" dropdown to filter flows by solution
3. **Search owners** - Use the "Search Owners" dropdown to filter flows by owner
4. **Quick search** - Use the search box for text-based filtering across flow names and descriptions
5. **Status filter** - Filter by flow status (Active, Inactive, Deleted)

### Managing Co-Owners

1. Click the **"Update Co-Owners"** button on a flow row
2. In the drawer, add or remove co-owners
3. Changes are saved immediately to Dataverse

### Managing Solutions

1. Click the **"Update Solution"** button on a flow row
2. Select the target solution from the dropdown
3. The flow is moved to the selected solution

### Viewing Flow Details

1. Click the **JSON icon** on a flow row to open the JSON Viewer
2. Inspect the raw flow definition and metadata
3. Use the search functionality within the JSON viewer to find specific properties

## Known Limitations

- **Large environments** - Initial load may take longer in environments with 1000+ flows
- **Batch operations** - Flows are processed with a batch size of 2 to optimize performance
- **Solution dropdown** - Only shows unmanaged solutions by default for most operations
- **Managed solutions** - Managed solutions can be viewed but are read-only

## Troubleshooting

**Flows not loading?**
- Verify your Dataverse connection is active
- Check that you have read permissions on the `workflow` table

**Can't update co-owners?**
- Ensure you have write permissions to the `workflow.ownerid` field
- Verify the user you're trying to add is an active user in your environment

**Performance issues?**
- Large environments may benefit from filtering by solution first
- Try limiting results by owner or status to reduce dataset size

## Contributing

Found a bug? Have a feature request? Please create an issue on the [GitHub repository](https://github.com/LinkeD365/FlowFinder/issues).

See our [open issues](https://github.com/LinkeD365/FlowFinder/issues) for planned features and known issues.

## Support

For documentation and support, visit:
- [LinkeD365 Blog](https://linked365.blog)
- [Matt Collins-Jones](https://www.collinsjones.dev)
- [GitHub Issues](https://github.com/LinkeD365/FlowFinder/issues)

## License

MIT

---

**Maintainers:** LinkeD365 · Matt Collins-Jones

> **Note:** This tool was developed with AI assistance. All code has been reviewed and tested by the maintainers.
