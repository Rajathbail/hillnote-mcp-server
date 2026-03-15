# Hillnote MCP Server

[![NPM Version](https://img.shields.io/npm/v/@hillnote/mcp-server)](https://www.npmjs.com/package/@hillnote/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0.4-green)](https://modelcontextprotocol.io)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](https://hillnote.com)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org)

Official [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for **Hillnote**, enabling AI assistants to interact with your document workspaces programmatically.

> **Platform Support:** Supports **macOS**, **Windows**, and **Linux**.

## Features

- 📁 **Multi-Workspace Support** - Manage multiple document workspaces
- 📝 **Document Management** - Full CRUD operations for documents
- 🔍 **Smart Search** - Fuzzy search with intelligent ranking across titles, tags, and content
- ✏️ **Content Manipulation** - Advanced content editing with validation and preview
- 🎯 **AI Recipes** - Manage and execute AI prompt recipes
- 🛠️ **HTML Tools** - Create interactive HTML-based utilities
- 📋 **Database & Task Management** - Create databases with rows, columns, views, and kanban boards for task tracking
- 🎨 **Slide Presentations** - Two-phase slide creation with storytelling guides and visual design tools
- 🎨 **Canvas Drawings** - Create and edit Excalidraw canvas drawings with shapes, text, arrows, and more
- 🏷️ **Metadata Support** - Rich document metadata with tags, emojis, and descriptions

## Requirements

- **macOS**, **Windows**, or **Linux**
- **Hillnote Desktop App**
- **Node.js** >= 18.0.0
- **MCP-compatible client** (Claude Desktop, Cursor, VS Code, etc.)

## Installation

### Option 1: Install from NPM (Recommended)

```bash
# Install globally (IMPORTANT: Use -g flag!)
npm install -g @hillnote/mcp-server

# Verify installation worked
npm list -g @hillnote/mcp-server

# If using Homebrew Node.js, the files will be in:
# /opt/homebrew/lib/node_modules/@hillnote/mcp-server/
```

⚠️ **Important:** The `-g` flag is required for global installation. Without it, the package installs locally and won't work with the Claude Desktop configuration.

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/HillnoteApp/hillnote-mcp-server.git
cd hillnote-mcp-server

# Install dependencies (NO -g flag needed here)
npm install
```

## Updating to Latest Version

### NPM Installation

```bash
# Update to the latest version
npm update -g @hillnote/mcp-server

# Or reinstall to force latest version
npm install -g @hillnote/mcp-server@latest

# Check current version
npm list -g @hillnote/mcp-server

# After updating, restart your MCP client (Claude Desktop, Cursor, etc.)
```

### Source Installation

```bash
# Navigate to your cloned repository
cd /path/to/hillnote-mcp-server

# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# After updating, restart your MCP client
```

### Version Check

To see what version you're currently running:

```bash
# For NPM installation
npm list -g @hillnote/mcp-server

# For source installation
cd /path/to/hillnote-mcp-server
cat package.json | grep version
```

### Troubleshooting Updates

If you experience issues after updating:

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Uninstall and reinstall:**
   ```bash
   npm uninstall -g @hillnote/mcp-server
   npm install -g @hillnote/mcp-server
   ```

3. **Restart your MCP client completely** (not just reload - fully quit and reopen)

## Configuration

The MCP server automatically discovers all your Hillnote workspaces from the app's configuration:

- **macOS:** `~/Library/Application Support/Hillnote/workspaces.json`
- **Windows:** `%APPDATA%/Hillnote/workspaces.json`
- **Linux:** `~/.config/Hillnote/workspaces.json`

### Configuration Examples

#### NPM Installation
If installed via NPM, use your global Node modules path:

```json
{
  "mcpServers": {
    "hillnote": {
      "command": "hillnote-mcp"
    }
  }
}
```

Find your path with: `npm root -g`

#### Source Installation
If cloned from GitHub:

```json
{
  "mcpServers": {
    "hillnote": {
      "command": "node",
      "args": ["/path/to/hillnote-mcp-server/index.js"]
    }
  }
}
```

### Client-Specific Configuration

<details>
<summary><strong>Claude Desktop</strong></summary>

Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the configuration above to this file.
</details>

<details>
<summary><strong>Cursor</strong></summary>

Location: Settings → Features → MCP

Add the configuration above to the MCP servers section.
</details>

<details>
<summary><strong>VS Code</strong></summary>

Install an MCP extension and add the configuration to your settings.json or extension configuration.
</details>

## Available Tools

### 📁 Workspace Management

#### `list_workspaces`
Lists all available workspaces with document counts and metadata.

```javascript
// No input required
// Returns: Array of workspace objects with path, name, overview, and documentCount
```

#### `read_registry`
Get complete workspace overview including all documents, folders, and relationships.

```javascript
// Input: { workspace: "workspace-name" }
// Returns: Complete registry with documents and folder structure
```

### 📄 Document Operations

#### `read_document`
Read a specific document's content and metadata.

```javascript
// Input: { workspace: "workspace-name", documentId: "doc-id" }
// Returns: Document content, metadata, and frontmatter
```

#### `add_document`
Create a new document with content and metadata.

```javascript
// Input: {
//   workspace: "workspace-name",
//   name: "Document Name",
//   content: "Document content",
//   emoji: "📄",
//   description: "Brief description",
//   parent: "optional-folder-id"
// }
// Returns: { success: true, documentId: "new-id", fileName: "document-name.md" }
```

#### `update_document`
Update an existing document's content or metadata.

```javascript
// Input: {
//   workspace: "workspace-name",
//   documentId: "doc-id",
//   content: "New content",
//   name: "New Name",
//   emoji: "📝",
//   description: "Updated description"
// }
// Returns: { success: true }
```

#### `rename_document`
Rename a document and update its file name.

```javascript
// Input: { workspace: "workspace-name", documentId: "doc-id", newTitle: "New Title" }
// Returns: { success: true, newFileName: "new-title.md" }
```

#### `delete_document`
Delete a document from the workspace.

```javascript
// Input: { workspace: "workspace-name", documentId: "doc-id" }
// Returns: { success: true }
```

### 🔍 Search

#### `search_documents`
Search documents with fuzzy matching and smart ranking.

```javascript
// Input: {
//   query: "search term",
//   workspace: "optional-workspace",
//   fuzzy: true,
//   threshold: 0.6,
//   limit: 10
// }
// Returns: Ranked search results with snippets and scores
```

### ✏️ Content Manipulation

#### `insert_content`
Insert content at a specific position with validation.

```javascript
// Input: {
//   workspace: "workspace-name",
//   documentId: "doc-id",
//   position: "start" | "end" | number | { line: number } | { after: "heading" },
//   text: "Content to insert",
//   validate: true,
//   preview: true
// }
// Returns: { success: true, preview: "...", validation: {...} }
```

#### `replace_content`
Replace text in a document with preview and occurrence info.

```javascript
// Input: {
//   workspace: "workspace-name",
//   documentId: "doc-id",
//   searchText: "text to find",
//   replaceText: "replacement text",
//   all: false,
//   caseSensitive: false,
//   wholeWord: false,
//   useRegex: false
// }
// Returns: { success: true, replacements: 1, preview: "..." }
```

#### `delete_content`
Delete content between positions or patterns.

```javascript
// Input: {
//   workspace: "workspace-name",
//   documentId: "doc-id",
//   startPos: 0 | { line: 5 } | { pattern: "## Section" },
//   endPos: 100 | { line: 10 } | { pattern: "## Next Section" }
// }
// Returns: { success: true, deletedChars: 95, preview: "..." }
```

#### `append_to_section`
Append content to a specific markdown section.

```javascript
// Input: {
//   workspace: "workspace-name",
//   documentId: "doc-id",
//   sectionHeading: "## Notes",
//   content: "Additional notes"
// }
// Returns: { success: true }
```

### 🎯 AI Recipe Management

Recipes are AI prompt overrides that trigger custom instructions when a user's request matches specific topics.

#### `list_recipes`
List all AI prompt recipes in a workspace.

```javascript
// Input: { workspacePath: "/path/to/workspace" }
// Returns: Array of recipe objects with metadata
```

#### `get_recipe`
Get a specific recipe by ID.

```javascript
// Input: { workspacePath: "/path/to/workspace", recipeId: "recipe-id" }
// Returns: Complete recipe with trigger, instructions, and document references
```

#### `create_recipe`
Create a new AI prompt recipe.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   recipe: {
//     when_user_asks_about: "quarterly reports",
//     override_instructions: "Use the company template and include KPIs...",
//     required_documents: ["documents/template.md"],
//     optional_documents: ["documents/past-reports.md"],
//     output_format: "markdown"
//   }
// }
// Returns: { success: true, recipe: { id: "recipe_...", ... } }
```

#### `update_recipe`
Update an existing recipe.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   recipeId: "recipe-id",
//   updates: {
//     when_user_asks_about: "updated trigger",
//     override_instructions: "updated instructions"
//   }
// }
// Returns: { success: true }
```

#### `get_recipe_documents`
Load the content of documents referenced by a recipe.

```javascript
// Input: { workspacePath: "/path/to/workspace", recipeId: "recipe-id", includeOptional: true }
// Returns: { recipe: {...}, documents: { required: [...], optional: [...] } }
```

### 📋 Database & Task Management

Databases are flexible folders containing markdown files (rows) with a `database.json` configuration. They can be used as task boards by adding `status` columns with kanban views.

#### `create_database`
Create a new database in a workspace.

```javascript
// Input: {
//   workspace: "workspace-name",
//   name: "Project Tasks",
//   columns: [
//     { id: "title", name: "Title", type: "title" },
//     { id: "status", name: "Status", type: "status",
//       options: ["To Do", "In Progress", "Done", "Archived"],
//       optionColors: { "To Do": "gray", "In Progress": "amber", "Done": "emerald", "Archived": "purple" },
//       optionStates: { "To Do": "normal", "In Progress": "normal", "Done": "done", "Archived": "archive" }
//     },
//     { id: "priority", name: "Priority", type: "select", options: ["Low", "Medium", "High"] },
//     { id: "recurring", name: "Recurring", type: "recurring" }
//   ],
//   views: [
//     { id: "kanban", name: "Board", type: "kanban", groupBy: "status" },
//     { id: "table", name: "Table", type: "table" }
//   ],
//   defaultView: "kanban",
//   folderPath: "optional/subfolder"
// }
// Returns: { success: true, name: "...", path: "..." }
```

**Column types:** `title`, `text`, `number`, `select`, `multiselect`, `status`, `checkbox`, `date`, `url`, `email`, `recurring`

**Status columns** support `optionStates` mapping each option to `"normal"`, `"done"` (strikethrough), or `"archive"` (dimmed) — enabling kanban board behaviour.

**Recurring columns** support auto-resetting tasks on daily/weekly/monthly/yearly schedules.

#### `read_database`
Read a database with optional filtering, sorting, and searching.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   search: "optional search query",
//   filters: [{ column: "status", operator: "equals", value: "In Progress" }],
//   sort: { column: "priority", direction: "desc" },
//   viewId: "kanban",
//   limit: 50
// }
// Returns: Database config (columns, views) and matching rows
```

#### `list_databases`
List all databases in a workspace.

```javascript
// Input: { workspace: "workspace-name" }
// Returns: Array of databases with metadata and row counts
```

#### `delete_database`
Delete a database and all its rows permanently.

```javascript
// Input: { workspace: "workspace-name", databasePath: "Project Tasks" }
// Returns: { success: true }
```

#### `add_rows`
Add one or more rows to a database.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   rows: [
//     { title: "Implement feature X", status: "To Do", priority: "High", _content: "Task details..." },
//     { title: "Fix bug Y", status: "In Progress", priority: "Medium" }
//   ]
// }
// Returns: { success: true, added: [...] }
```

#### `update_rows`
Update rows by ID (file path) or matching criteria.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   updates: { status: "Done", priority: "Low" },
//   ids: ["/path/to/row.md"],       // by file path
//   where: { status: "In Progress" } // or by criteria
// }
// Returns: { success: true, updated: [...] }
```

#### `delete_rows`
Delete rows by ID or matching criteria.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   ids: ["/path/to/row.md"],
//   where: { status: "Archived" }
// }
// Returns: { success: true }
```

#### `add_column`
Add a new column to a database.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   column: { id: "assignee", name: "Assignee", type: "text" },
//   defaultValue: "Unassigned"
// }
// Returns: { success: true }
```

#### `update_column`
Update column properties (name, type, options, colors, states).

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   columnId: "status",
//   updates: { options: ["To Do", "In Progress", "Review", "Done"] }
// }
// Returns: { success: true }
```

#### `delete_column`
Remove a column from a database and all rows.

```javascript
// Input: { workspace: "workspace-name", databasePath: "Project Tasks", columnId: "priority" }
// Returns: { success: true }
```

#### `create_view`
Create a saved view with filters, sorts, and display options.

```javascript
// Input: {
//   workspace: "workspace-name",
//   databasePath: "Project Tasks",
//   view: {
//     name: "Active Tasks",
//     type: "kanban",        // table, kanban, gallery, chart
//     groupBy: "status",
//     filters: [{ column: "status", operator: "notEquals", value: "Archived" }],
//     sorts: [{ column: "priority", direction: "desc" }]
//   }
// }
// Returns: { success: true, viewId: "..." }
```

#### `list_views`
List all saved views for a database.

```javascript
// Input: { workspace: "workspace-name", databasePath: "Project Tasks" }
// Returns: Array of view configurations
```

### 🎨 Slide Presentations

Slides use a two-phase workflow: write the story first, then add visual design.

#### `get_slides_story_guide`
Get the storytelling guide with 8 proven techniques (Hero's Journey, Sparklines, In Medias Res, etc.).

```javascript
// No input required
// Returns: Story-writing guide with narrative techniques and structure advice
// Important: Do NOT use any visual layout markers (~split, ~inline, ~bg-, etc.) during this phase
```

#### `get_slides_visual_guide`
Get the visual design guide for adding layout markers, images, charts, and diagrams.

```javascript
// Input: { documentPath: "documents/my-presentation.slides.md" }
// Returns: Visual design guide with layout markers, chart types, mermaid diagrams, and examples
// Note: Requires the .slides.md file to already exist (proves story has been drafted)
```

**Important:** When creating slides with `add_document`, the title MUST end with `.slides.md` (e.g., "My Presentation.slides.md"). The `.slides.md` extension is what makes it a slide presentation.

**Example workflow:**
```javascript
// 1. Get the story guide first
get_slides_story_guide()

// 2. Create the slide presentation (story content only, no visual markers)
add_document({
  workspace: "workspace-name",
  name: "Quarterly Review.slides.md",  // Note: ends with .slides.md
  content: `---
type: slides
theme: minimal
---

# Quarterly Review

Q4 2024 Results

***

# Key Metrics

- Revenue: $1.2M
- Growth: 25%
- Users: 10,000+
`
})

// 3. Get the visual guide and enhance slides in batches of 3-5
get_slides_visual_guide({ documentPath: "documents/quarterly-review.slides.md" })
// Then edit the file to add ~split, ~inline, ~bg-, images, charts, etc.
```

### 🎨 Canvas Drawings

#### `get_canvas_guide`
Get the comprehensive guide for creating and editing Excalidraw canvas drawings in Hillnote.

```javascript
// No input required
// Returns: Complete guide with element types, layout planning, spacing rules, colors, and best practices
```

**Important:** When creating a canvas with `add_document`, the title MUST end with `.canvas.md` (e.g., "Architecture Diagram.canvas.md"). Do NOT provide content — the system generates it automatically.

#### `read_canvas`
Read and parse a canvas file, returning a structured description of all elements.

```javascript
// Input: { workspace: "workspace-name", canvasPath: "documents/my-drawing.canvas.md" }
// Returns: { canvasPath: "...", elementCount: 5, elements: [...] }
```

#### `add_canvas_elements`
Add shapes, text, arrows, and other elements to a canvas file.

```javascript
// Input: {
//   workspace: "workspace-name",
//   canvasPath: "documents/my-drawing.canvas.md",
//   elements: [
//     { type: "rectangle", x: 0, y: 0, width: 200, height: 100, label: "Start", backgroundColor: "#a5d8ff" },
//     { type: "arrow", x: 200, y: 50, points: [[0, 0], [100, 0]] },
//     { type: "rectangle", x: 300, y: 0, width: 200, height: 100, label: "End", backgroundColor: "#b2f2bb" },
//     { type: "text", x: 0, y: 120, text: "My Diagram", fontSize: 28 }
//   ]
// }
// Returns: { success: true, added: 4, totalElements: 4, elementIds: [...] }
```

**Supported element types:** `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`

**Element properties:**
- **Position/size:** `x`, `y`, `width`, `height`
- **Styling:** `strokeColor`, `backgroundColor`, `fillStyle` (solid/hachure/cross-hatch), `strokeWidth`, `roughness` (0-2), `opacity` (0-100)
- **Text:** `text`, `fontSize`, `fontFamily` (1=Virgil, 2=Helvetica, 3=Cascadia, 5=Excalifont), `textAlign`
- **Arrows/lines:** `points` (e.g., `[[0,0],[200,100]]`), `startArrowhead`, `endArrowhead`
- **Shapes:** `label` (centered text inside rectangle/ellipse/diamond)
- **Grouping:** `groupId`

#### `clear_canvas`
Remove all elements from a canvas file, giving a blank slate.

```javascript
// Input: { workspace: "workspace-name", canvasPath: "documents/my-drawing.canvas.md" }
// Returns: { success: true, message: "All elements cleared from canvas" }
```

**Example workflow:**
```javascript
// 1. Get the canvas guide first
get_canvas_guide()

// 2. Create a new canvas
add_document({
  workspace: "workspace-name",
  name: "Architecture Diagram.canvas.md"  // Note: ends with .canvas.md, no content needed
})

// 3. Add elements to the canvas
add_canvas_elements({
  workspace: "workspace-name",
  canvasPath: "documents/architecture-diagram.canvas.md",
  elements: [
    { type: "text", x: 0, y: 0, text: "System Architecture", fontSize: 28 },
    { type: "rectangle", x: 0, y: 50, width: 200, height: 80, label: "Frontend", backgroundColor: "#a5d8ff" },
    { type: "arrow", x: 200, y: 90, points: [[0, 0], [100, 0]] },
    { type: "rectangle", x: 300, y: 50, width: 200, height: 80, label: "Backend", backgroundColor: "#b2f2bb" }
  ]
})

// 4. To redraw from scratch
clear_canvas({ workspace: "workspace-name", canvasPath: "documents/architecture-diagram.canvas.md" })
// Then add_canvas_elements again with new elements
```

### 🛠️ HTML Tool Management

#### `add_html_tool`
Create an interactive HTML tool in the workspace.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   toolName: "calculator",
//   description: "Scientific calculator",
//   category: "utilities",  // optional
//   files: [
//     { filename: "index.html", content: "<!DOCTYPE html>...", isEntryPoint: true },
//     { filename: "styles.css", content: "body { ... }" },
//     { filename: "script.js", content: "// JS code" }
//   ]
// }
// Returns: { success: true, path: "resources/html/calculator", entryPoint: "index.html", markdownLink: "[html:calculator](...)" }
```

#### `edit_html_tool`
Edit files in an existing HTML tool (create, update, or delete files).

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   toolName: "calculator",
//   category: "utilities",  // optional
//   operations: [
//     { action: "update", filename: "index.html", content: "<!DOCTYPE html>..." },
//     { action: "create", filename: "utils.js", content: "// new file" },
//     { action: "delete", filename: "old-file.js" }
//   ],
//   updateMetadata: { description: "Updated calculator" }
// }
// Returns: { success: true, changes: { created: [...], updated: [...], deleted: [...] } }
```

#### `add_tool_to_doc`
Insert an HTML tool reference into a document.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   documentPath: "documents/my-doc.md",
//   toolName: "calculator",
//   displayName: "My Calculator",  // optional
//   position: "end"  // "end", "beginning", or "after:<text>"
// }
// Returns: { success: true, toolLink: "[html:My Calculator](...)" }
```

#### `list_html_tools`
List all HTML tools in a workspace.

```javascript
// Input: { workspacePath: "/path/to/workspace", category: "utilities" }
// Returns: Array of HTML tools with metadata and markdown links
```

#### `get_html_tool`
Get a specific HTML tool's details and files.

```javascript
// Input: { workspacePath: "/path/to/workspace", toolName: "calculator", category: "utilities" }
// Returns: Tool info with all file contents, entry point, and markdown link
```

#### `read_html_file`
Read the content of a specific file inside an HTML tool.

```javascript
// Input: { workspacePath: "/path/to/workspace", filePath: "resources/html/calculator/index.html" }
// Returns: { filePath: "...", content: "..." }
```

#### `write_html_file`
Write or create a file inside an HTML tool folder.

```javascript
// Input: { workspacePath: "/path/to/workspace", filePath: "resources/html/calculator/style.css", content: "body { ... }" }
// Returns: { success: true, filePath: "..." }
```

#### `replace_in_html_file`
Find and replace text in an HTML tool file.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   filePath: "resources/html/calculator/index.html",
//   searchText: "<title>Old Title</title>",
//   replaceText: "<title>New Title</title>"
// }
// Returns: { success: true, filePath: "..." }
```

## Workspace Structure

Hillnote workspaces are typically stored in your Documents folder or custom locations:

```
~/Documents/YourWorkspace/
├── readme.md                 # Workspace overview
├── documents-registry.json   # Document metadata
├── ai_prompt_overrides.json # AI prompt recipes/overrides
├── documents/               # Markdown documents and databases
│   ├── document-1.md
│   ├── folder/
│   │   └── document-2.md
│   └── Project Tasks/       # Database (e.g., task board)
│       ├── database.json    # Database configuration (columns, views)
│       ├── implement-feature-x.md  # Row (task) with frontmatter
│       └── fix-bug-y.md    # Row (task) with frontmatter
└── resources/               # Assets and tools
    ├── images/             # Image attachments
    └── html/               # HTML tools
        └── tool-name/
            ├── index.html
            └── assets/
```

## Document Format

Documents use Markdown with YAML frontmatter:

```markdown
---
title: Document Title
tags: [tag1, tag2]
emoji: 📄
description: Brief description
created: 2024-01-01T00:00:00Z
modified: 2024-01-02T00:00:00Z
---

# Document Title

Your content here...
```

## Development

### Project Structure

```
mcp-server/
├── index.js                 # Main server entry point
├── config.json             # Server configuration
├── package.json            # Dependencies
├── src/
│   ├── tools/
│   │   ├── index.js       # Tool aggregator
│   │   ├── workspace.js   # Workspace tools
│   │   ├── document.js    # Document tools
│   │   ├── content.js     # Content manipulation
│   │   ├── search.js      # Search tools
│   │   ├── recipe.js      # Recipe management
│   │   ├── html-tool.js   # HTML tool management
│   │   ├── database.js    # Database, row, column, and view management
│   │   ├── slides.js      # Slide presentation guides (story + visual)
│   │   └── canvas.js      # Excalidraw canvas drawings
│   └── utils/
│       └── helpers.js     # Utility functions
└── README.md
```

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Export tool definitions and handlers
3. Import in `src/tools/index.js`
4. Tools are automatically available to MCP clients

### Running in Development

```bash
# Enable watch mode
npm run dev

# Run the server
npm start
```

## Error Handling

All tools use structured error responses:

- `InvalidParams`: Missing or invalid parameters
- `InternalError`: Server-side errors
- `MethodNotFound`: Unknown tool name

## Security

- File operations are sandboxed to workspace directories
- No network requests are made
- Path traversal protection included
- Input validation on all operations

## License

MIT - See [LICENSE](LICENSE) file

## Support

- **Issues**: [GitHub Issues](https://github.com/HillnoteApp/hillnote-mcp-server/issues)
- **Email**: support@hillnote.com
- **Documentation**: [Hillnote Docs](https://hillnote.com/docs)

---

Built with ❤️ by Rajath Bail