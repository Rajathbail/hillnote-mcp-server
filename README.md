# Hillnote MCP Server

[![NPM Version](https://img.shields.io/npm/v/@hillnote/mcp-server)](https://www.npmjs.com/package/@hillnote/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0.4-green)](https://modelcontextprotocol.io)
[![Platform](https://img.shields.io/badge/Platform-macOS-blue)](https://hillnote.com)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org)

Official [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for **Hillnote**, enabling AI assistants to interact with your document workspaces programmatically.

> **Platform Support:** Currently supports **macOS**. Windows support coming soon with Hillnote for Windows launch.

## Features

- 📁 **Multi-Workspace Support** - Manage multiple document workspaces
- 📝 **Document Management** - Full CRUD operations for documents
- 🔍 **Smart Search** - Fuzzy search with intelligent ranking across titles, tags, and content
- ✏️ **Content Manipulation** - Advanced content editing with validation and preview
- 🎯 **AI Recipes** - Manage and execute AI prompt recipes
- 🛠️ **HTML Tools** - Create interactive HTML-based utilities
- 📋 **Tasklist Management** - Create and manage Kanban-style tasklists with full task CRUD operations
- 🎨 **Slide Presentations** - Create and edit slide presentations with themes, charts, and templates
- 🎨 **Canvas Drawings** - Create and edit Excalidraw canvas drawings with shapes, text, arrows, and more
- 🏷️ **Metadata Support** - Rich document metadata with tags, emojis, and descriptions

## Requirements

- **macOS** (Windows support coming soon)
- **Hillnote Desktop App** for macOS
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

The MCP server automatically discovers all your Hillnote workspaces from the app's configuration at `~/Library/Application Support/Hillnote/workspaces.json`.

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
// Returns: Complete recipe with prompts and configuration
```

#### `add_recipe`
Create a new AI prompt recipe.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   name: "Recipe Name",
//   description: "What this recipe does",
//   prompts: [...],
//   config: {...}
// }
// Returns: { success: true, recipeId: "new-id" }
```

#### `update_recipe`
Update an existing recipe.

```javascript
// Input: { workspacePath: "/path/to/workspace", recipeId: "id", updates: {...} }
// Returns: { success: true }
```

#### `delete_recipe`
Delete a recipe.

```javascript
// Input: { workspacePath: "/path/to/workspace", recipeId: "id" }
// Returns: { success: true }
```

### 📋 Tasklist Management

#### `create_tasklist`
Create a new tasklist (Kanban board) in a workspace.

```javascript
// Input: {
//   workspace: "workspace-name",
//   tasklist: {
//     name: "Project Tasks",
//     columns: [
//       { name: "To Do", color: "blue" },
//       { name: "In Progress", color: "orange" },
//       { name: "Done", isDoneColumn: true, color: "green" }
//     ],
//     viewMode: "projects"  // or "flat"
//   }
// }
// Returns: { success: true, tasklistName: "...", tasklistPath: "documents/...", columns: [...] }
```

#### `list_tasklists`
List all tasklists in a workspace.

```javascript
// Input: { workspace: "workspace-name" }
// Returns: Array of tasklists with task counts, project counts, and columns
```

#### `read_tasklist`
Read a complete tasklist structure with all task metadata.

```javascript
// Input: { workspace: "workspace-name", tasklist: "Project Tasks" }
// Returns: Complete tasklist with columns, projects, tasks, and metadata
// Note: Task content not included - use read_document to read task content
```

#### `add_task`
Create a new task in a tasklist.

```javascript
// Input: {
//   workspace: "workspace-name",
//   tasklist: "Project Tasks",
//   task: {
//     name: "Implement feature X",
//     content: "Task description...",
//     status: "To Do",
//     project: "Backend",  // optional
//     priority: "high",    // low, medium, high
//     assignedTo: "user@example.com",
//     startDate: "2024-01-01",
//     endDate: "2024-01-15",
//     isRecurring: false,
//     emoji: "🔥"
//   }
// }
// Returns: { success: true, taskName: "...", taskPath: "...", status: "..." }
```

#### `update_task_status`
Move a task to a different column/status.

```javascript
// Input: {
//   workspace: "workspace-name",
//   tasklist: "Project Tasks",
//   taskName: "Implement feature X",
//   newStatus: "In Progress"
// }
// Returns: { success: true, taskName: "...", oldStatus: "...", newStatus: "..." }
```

#### `update_task_metadata`
Update task properties (priority, assignments, dates, recurring settings).

```javascript
// Input: {
//   workspace: "workspace-name",
//   tasklist: "Project Tasks",
//   taskName: "Implement feature X",
//   metadata: {
//     priority: "high",
//     assignedTo: "user@example.com",
//     startDate: "2024-01-01",
//     endDate: "2024-01-15",
//     isRecurring: true,
//     recurrenceFrequency: "weekly"  // daily, weekly, monthly, yearly
//   }
// }
// Returns: { success: true, taskName: "...", updatedFields: [...] }
```

### 🎨 Slide Presentations

#### `get_slides_guide`
Get the comprehensive guide for creating and editing slide presentations in Hillnote.

```javascript
// No input required
// Returns: Complete guide with syntax, templates, chart types, and best practices
```

**Important:** When creating slides with `add_document`, the title MUST end with `.slides.md` (e.g., "My Presentation.slides.md"). The `.slides.md` extension is what makes it a slide presentation.

**Example workflow:**
```javascript
// 1. Get the slides guide first
get_slides_guide()

// 2. Create a new slide presentation
add_document({
  workspace: "workspace-name",
  name: "Quarterly Review.slides.md",  // Note: ends with .slides.md
  content: `---
type: slides
theme: minimal
---

# Quarterly Review

Q4 2024 Results

---

# Key Metrics

- Revenue: $1.2M
- Growth: 25%
- Users: 10,000+
`
})
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
//   files: [
//     { name: "index.html", content: "<!DOCTYPE html>..." },
//     { name: "styles.css", content: "body { ... }" },
//     { name: "script.js", content: "// JS code" }
//   ]
// }
// Returns: { success: true, toolPath: "resources/html/calculator", url: "..." }
```

#### `list_html_tools`
List all HTML tools in a workspace.

```javascript
// Input: { workspacePath: "/path/to/workspace" }
// Returns: Array of HTML tools with metadata
```

#### `get_html_tool`
Get a specific HTML tool's files.

```javascript
// Input: { workspacePath: "/path/to/workspace", toolName: "calculator" }
// Returns: Tool info with all file contents
```

#### `update_html_tool`
Update an HTML tool's files.

```javascript
// Input: {
//   workspacePath: "/path/to/workspace",
//   toolName: "calculator",
//   updates: { description: "...", files: [...] }
// }
// Returns: { success: true }
```

#### `delete_html_tool`
Delete an HTML tool.

```javascript
// Input: { workspacePath: "/path/to/workspace", toolName: "calculator" }
// Returns: { success: true }
```

## Workspace Structure

Hillnote workspaces on macOS are typically stored in your Documents folder or custom locations:

```
~/Documents/YourWorkspace/
├── readme.md                 # Workspace overview
├── documents-registry.json   # Document metadata
├── ai-recipes.json          # AI prompt recipes
├── documents/               # Markdown documents and tasklists
│   ├── document-1.md
│   ├── folder/
│   │   └── document-2.md
│   └── Project Tasks/       # Tasklist (Kanban board)
│       ├── tasklist.json    # Tasklist configuration
│       ├── task-1.md        # Root-level task
│       └── Backend/         # Project folder
│           └── task-2.md    # Task in project
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
│   │   ├── tasklist.js    # Tasklist/Kanban management
│   │   ├── slides.js      # Slide presentation guide
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