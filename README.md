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

## Configuration

The MCP server automatically discovers all your Hillnote workspaces from the app's configuration at `~/Library/Application Support/Hillnote/workspaces.json`.

### Configuration Examples

#### NPM Installation
If installed via NPM, use your global Node modules path:

```json
{
  "mcpServers": {
    "hillnote": {
      "command": "node",
      "args": ["/opt/homebrew/lib/node_modules/@hillnote/mcp-server/index.js"]
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
├── documents/               # Markdown documents
│   ├── document-1.md
│   └── folder/
│       └── document-2.md
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
│   │   └── html-tool.js   # HTML tool management
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