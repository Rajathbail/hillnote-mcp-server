import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { resolveWorkspace, ensureDirectory } from '../utils/helpers.js';

/**
 * Database Tools for Hillnote MCP Server
 *
 * Provides CRUD operations for databases, rows, columns, and views.
 * Databases are folders containing markdown files (rows) and a database.json config file.
 */

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize path separators to forward slashes
 */
function normalizePath(filePath) {
  if (!filePath) return filePath;
  return filePath.replace(/\\/g, '/');
}

/**
 * Generate a safe filename from a title
 */
function generateSafeFileName(title) {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `${sanitized || 'untitled'}.md`;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseMarkdownWithFrontmatter(content) {
  try {
    const { data: frontmatter, content: body } = matter(content);
    return { frontmatter, content: body };
  } catch (error) {
    return { frontmatter: {}, content: content || '' };
  }
}

/**
 * Stringify markdown with YAML frontmatter
 */
function stringifyMarkdownWithFrontmatter(frontmatter, content) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }
  return matter.stringify(content, frontmatter);
}

/**
 * Find all databases in a workspace
 */
async function findDatabases(workspacePath) {
  const databases = [];
  const documentsPath = path.join(workspacePath, 'documents');

  async function scanDirectory(dirPath, relativePath = '') {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const subDirPath = path.join(dirPath, item.name);
          const configPath = path.join(subDirPath, 'database.json');

          try {
            await fs.access(configPath);
            // This is a database folder
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);

            databases.push({
              name: config.name || item.name,
              path: normalizePath(path.join(relativePath, item.name)),
              fullPath: normalizePath(subDirPath),
              columns: config.columns || [],
              views: config.views || [],
              defaultView: config.defaultView || 'default'
            });
          } catch {
            // Not a database folder, recursively scan
            await scanDirectory(subDirPath, path.join(relativePath, item.name));
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  await scanDirectory(documentsPath);
  return databases;
}

/**
 * Get database config by path
 */
async function getDatabaseConfig(workspacePath, databasePath) {
  const fullPath = databasePath.startsWith('/')
    ? databasePath
    : path.join(workspacePath, 'documents', databasePath);

  const configPath = path.join(fullPath, 'database.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return { config: JSON.parse(content), fullPath: normalizePath(fullPath) };
  } catch (error) {
    throw new McpError(ErrorCode.InvalidRequest, `Database not found at path: ${databasePath}`);
  }
}

/**
 * Save database config
 */
async function saveDatabaseConfig(databaseFullPath, config) {
  const configPath = path.join(databaseFullPath, 'database.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get all rows from a database
 */
async function getDatabaseRows(databaseFullPath) {
  const rows = [];

  try {
    const items = await fs.readdir(databaseFullPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile() && item.name.endsWith('.md') && item.name !== 'database.json') {
        const filePath = path.join(databaseFullPath, item.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, content: bodyContent } = parseMarkdownWithFrontmatter(content);

        // Use filename (without .md) as the title
        const title = item.name.replace('.md', '');

        rows.push({
          id: normalizePath(filePath),
          filePath: normalizePath(filePath),
          fileName: item.name,
          title,
          ...frontmatter,
          _contentPreview: bodyContent.substring(0, 200)
        });
      }
    }
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to read database rows: ${error.message}`);
  }

  return rows;
}

// ============================================================================
// Database Management Functions
// ============================================================================

/**
 * Create a new database
 */
export async function createDatabase(workspaceIdOrPath, name, columns = [], folderPath = null) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Determine the database path
    const basePath = folderPath
      ? path.join(workspace.path, 'documents', folderPath, name)
      : path.join(workspace.path, 'documents', name);

    // Check if database already exists
    try {
      await fs.access(path.join(basePath, 'database.json'));
      throw new McpError(ErrorCode.InvalidRequest, `Database "${name}" already exists at this path`);
    } catch (error) {
      if (error instanceof McpError) throw error;
      // Database doesn't exist, proceed
    }

    // Create database directory
    await ensureDirectory(basePath);

    // Create default columns if none provided
    const defaultColumns = columns.length > 0 ? columns : [
      { id: 'title', name: 'Title', type: 'title' },
      { id: 'status', name: 'Status', type: 'select', options: ['Todo', 'In Progress', 'Done'] },
      { id: 'tags', name: 'Tags', type: 'multiselect', options: [] }
    ];

    // Create default config
    const config = {
      name,
      columns: defaultColumns,
      views: [
        { id: 'default', name: 'All Items', type: 'table', filters: [], sorts: [] }
      ],
      defaultView: 'default',
      created: new Date().toISOString()
    };

    // Write config file
    await saveDatabaseConfig(basePath, config);

    return {
      success: true,
      database: {
        name,
        path: normalizePath(folderPath ? path.join(folderPath, name) : name),
        fullPath: normalizePath(basePath),
        columns: defaultColumns,
        views: config.views
      },
      message: `Database "${name}" created successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to create database: ${error.message}`);
  }
}

/**
 * Read a database with optional filtering, sorting, and searching
 */
export async function readDatabase(workspaceIdOrPath, databasePath, options = {}) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config, fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    let rows = await getDatabaseRows(fullPath);

    // Apply search filter
    if (options.search) {
      const query = options.search.toLowerCase();
      rows = rows.filter(row =>
        row.title?.toLowerCase().includes(query) ||
        Object.values(row).some(v =>
          typeof v === 'string' && v.toLowerCase().includes(query)
        )
      );
    }

    // Apply column filters
    if (options.filters && Array.isArray(options.filters)) {
      for (const filter of options.filters) {
        rows = rows.filter(row => {
          const value = row[filter.column];
          const filterValue = filter.value;

          switch (filter.operator) {
            case 'equals':
              if (typeof value === 'boolean') return value === filterValue;
              return String(value || '').toLowerCase() === String(filterValue || '').toLowerCase();
            case 'notEquals':
              if (typeof value === 'boolean') return value !== filterValue;
              return String(value || '').toLowerCase() !== String(filterValue || '').toLowerCase();
            case 'contains':
              return String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
            case 'notContains':
              return !String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
            case 'greaterThan':
              return Number(value) > Number(filterValue);
            case 'lessThan':
              return Number(value) < Number(filterValue);
            case 'isEmpty':
              return value === null || value === undefined || value === '';
            case 'isNotEmpty':
              return value !== null && value !== undefined && value !== '';
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    if (options.sort) {
      const { column, direction = 'asc' } = options.sort;
      rows.sort((a, b) => {
        const aVal = a[column] ?? '';
        const bVal = b[column] ?? '';

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const comparison = String(aVal).localeCompare(String(bVal));
        return direction === 'asc' ? comparison : -comparison;
      });
    }

    // Apply view if specified
    if (options.viewId && config.views) {
      const view = config.views.find(v => v.id === options.viewId);
      if (view) {
        // Apply view filters (if not already filtered)
        if (!options.filters && view.filters?.length > 0) {
          for (const filter of view.filters) {
            rows = rows.filter(row => {
              const value = row[filter.column];
              const filterValue = filter.value;

              switch (filter.operator) {
                case 'equals':
                  return String(value || '').toLowerCase() === String(filterValue || '').toLowerCase();
                case 'contains':
                  return String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
                default:
                  return true;
              }
            });
          }
        }

        // Apply view sorts (if not already sorted)
        if (!options.sort && view.sorts?.length > 0) {
          const sort = view.sorts[0];
          rows.sort((a, b) => {
            const aVal = a[sort.column] ?? '';
            const bVal = b[sort.column] ?? '';
            const comparison = String(aVal).localeCompare(String(bVal));
            return sort.direction === 'asc' ? comparison : -comparison;
          });
        }
      }
    }

    // Apply limit
    if (options.limit && typeof options.limit === 'number') {
      rows = rows.slice(0, options.limit);
    }

    return {
      database: {
        name: config.name,
        path: databasePath,
        columns: config.columns,
        views: config.views
      },
      rows,
      totalCount: rows.length
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to read database: ${error.message}`);
  }
}

/**
 * List all databases in a workspace
 */
export async function listDatabases(workspaceIdOrPath) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const databases = await findDatabases(workspace.path);

    // Get row counts for each database
    const databasesWithCounts = await Promise.all(
      databases.map(async (db) => {
        const rows = await getDatabaseRows(db.fullPath);
        return {
          ...db,
          rowCount: rows.length
        };
      })
    );

    return {
      workspace: workspace.name,
      databases: databasesWithCounts,
      count: databasesWithCounts.length
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to list databases: ${error.message}`);
  }
}

/**
 * Delete a database
 */
export async function deleteDatabase(workspaceIdOrPath, databasePath) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    // Delete the entire database folder
    await fs.rm(fullPath, { recursive: true, force: true });

    return {
      success: true,
      message: `Database at "${databasePath}" deleted successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to delete database: ${error.message}`);
  }
}

// ============================================================================
// Row Operations
// ============================================================================

/**
 * Add one or more rows to a database
 */
export async function addRows(workspaceIdOrPath, databasePath, rows) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    const rowsArray = Array.isArray(rows) ? rows : [rows];
    const addedRows = [];

    for (const rowData of rowsArray) {
      const title = rowData.title || 'Untitled';
      const fileName = generateSafeFileName(title);

      // Check if file already exists
      let uniqueFileName = fileName;
      let counter = 1;
      while (true) {
        try {
          await fs.access(path.join(fullPath, uniqueFileName));
          // File exists, generate a new name
          const baseName = fileName.replace('.md', '');
          uniqueFileName = `${baseName}-${counter}.md`;
          counter++;
        } catch {
          // File doesn't exist, use this name
          break;
        }
      }

      const filePath = path.join(fullPath, uniqueFileName);

      // Prepare frontmatter (exclude title, it's the filename)
      const frontmatter = { ...rowData };
      delete frontmatter.title;

      // Create content with frontmatter
      const bodyContent = rowData._content || `# ${title}\n\n`;
      delete frontmatter._content;

      const content = stringifyMarkdownWithFrontmatter(frontmatter, bodyContent);

      // Write the file
      await fs.writeFile(filePath, content);

      addedRows.push({
        id: normalizePath(filePath),
        filePath: normalizePath(filePath),
        fileName: uniqueFileName,
        title,
        ...frontmatter
      });
    }

    return {
      success: true,
      addedRows,
      count: addedRows.length,
      message: `Added ${addedRows.length} row(s) to database`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to add rows: ${error.message}`);
  }
}

/**
 * Update rows by ID or matching criteria
 */
export async function updateRows(workspaceIdOrPath, databasePath, updates, options = {}) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    const rows = await getDatabaseRows(fullPath);
    const updatedRows = [];

    // Determine which rows to update
    let rowsToUpdate = [];

    if (options.ids && Array.isArray(options.ids)) {
      // Update by specific IDs (file paths)
      rowsToUpdate = rows.filter(r => options.ids.includes(r.id) || options.ids.includes(r.filePath));
    } else if (options.where) {
      // Update by matching criteria
      rowsToUpdate = rows.filter(row => {
        return Object.entries(options.where).every(([key, value]) => {
          return row[key] === value;
        });
      });
    } else {
      throw new McpError(ErrorCode.InvalidParams, 'Must provide either "ids" or "where" criteria for updates');
    }

    for (const row of rowsToUpdate) {
      // Read current file content
      const content = await fs.readFile(row.filePath, 'utf-8');
      const { frontmatter, content: bodyContent } = parseMarkdownWithFrontmatter(content);

      // Handle title rename (requires file rename)
      if (updates.title && updates.title !== row.title) {
        const newFileName = generateSafeFileName(updates.title);
        const newFilePath = path.join(fullPath, newFileName);

        // Update frontmatter with new values (excluding title)
        const newFrontmatter = { ...frontmatter, ...updates };
        delete newFrontmatter.title;
        delete newFrontmatter._content;

        // Write new content
        const newBodyContent = updates._content || bodyContent;
        const newContent = stringifyMarkdownWithFrontmatter(newFrontmatter, newBodyContent);

        // Write to new file and delete old one
        await fs.writeFile(newFilePath, newContent);
        await fs.unlink(row.filePath);

        updatedRows.push({
          id: normalizePath(newFilePath),
          filePath: normalizePath(newFilePath),
          title: updates.title,
          ...newFrontmatter
        });
      } else {
        // Just update frontmatter
        const newFrontmatter = { ...frontmatter, ...updates };
        delete newFrontmatter.title;
        delete newFrontmatter._content;

        const newBodyContent = updates._content || bodyContent;
        const newContent = stringifyMarkdownWithFrontmatter(newFrontmatter, newBodyContent);

        await fs.writeFile(row.filePath, newContent);

        updatedRows.push({
          id: row.id,
          filePath: row.filePath,
          title: row.title,
          ...newFrontmatter
        });
      }
    }

    return {
      success: true,
      updatedRows,
      count: updatedRows.length,
      message: `Updated ${updatedRows.length} row(s)`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to update rows: ${error.message}`);
  }
}

/**
 * Delete rows by ID or matching criteria
 */
export async function deleteRows(workspaceIdOrPath, databasePath, options = {}) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    const rows = await getDatabaseRows(fullPath);
    const deletedRows = [];

    // Determine which rows to delete
    let rowsToDelete = [];

    if (options.ids && Array.isArray(options.ids)) {
      // Delete by specific IDs (file paths)
      rowsToDelete = rows.filter(r => options.ids.includes(r.id) || options.ids.includes(r.filePath));
    } else if (options.where) {
      // Delete by matching criteria
      rowsToDelete = rows.filter(row => {
        return Object.entries(options.where).every(([key, value]) => {
          return row[key] === value;
        });
      });
    } else {
      throw new McpError(ErrorCode.InvalidParams, 'Must provide either "ids" or "where" criteria for deletion');
    }

    for (const row of rowsToDelete) {
      await fs.unlink(row.filePath);
      deletedRows.push({
        id: row.id,
        title: row.title
      });
    }

    return {
      success: true,
      deletedRows,
      count: deletedRows.length,
      message: `Deleted ${deletedRows.length} row(s)`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to delete rows: ${error.message}`);
  }
}

// ============================================================================
// Column Operations
// ============================================================================

/**
 * Add a column to a database
 */
export async function addColumn(workspaceIdOrPath, databasePath, column, defaultValue = null) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config, fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    // Check if column already exists
    if (config.columns.some(c => c.id === column.id)) {
      throw new McpError(ErrorCode.InvalidRequest, `Column "${column.id}" already exists`);
    }

    // Add column to config
    config.columns.push(column);
    await saveDatabaseConfig(fullPath, config);

    // If defaultValue is provided, update all existing rows
    if (defaultValue !== null && defaultValue !== undefined) {
      const rows = await getDatabaseRows(fullPath);

      for (const row of rows) {
        const content = await fs.readFile(row.filePath, 'utf-8');
        const { frontmatter, content: bodyContent } = parseMarkdownWithFrontmatter(content);

        // Add the default value to frontmatter
        frontmatter[column.id] = defaultValue;

        const newContent = stringifyMarkdownWithFrontmatter(frontmatter, bodyContent);
        await fs.writeFile(row.filePath, newContent);
      }
    }

    return {
      success: true,
      column,
      message: `Column "${column.name}" added successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to add column: ${error.message}`);
  }
}

/**
 * Update column properties
 */
export async function updateColumn(workspaceIdOrPath, databasePath, columnId, updates) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config, fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    const columnIndex = config.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) {
      throw new McpError(ErrorCode.InvalidRequest, `Column "${columnId}" not found`);
    }

    // Update column properties
    config.columns[columnIndex] = {
      ...config.columns[columnIndex],
      ...updates
    };

    await saveDatabaseConfig(fullPath, config);

    // If column ID is being changed, update all rows
    if (updates.id && updates.id !== columnId) {
      const rows = await getDatabaseRows(fullPath);

      for (const row of rows) {
        const content = await fs.readFile(row.filePath, 'utf-8');
        const { frontmatter, content: bodyContent } = parseMarkdownWithFrontmatter(content);

        // Rename the key in frontmatter
        if (columnId in frontmatter) {
          frontmatter[updates.id] = frontmatter[columnId];
          delete frontmatter[columnId];

          const newContent = stringifyMarkdownWithFrontmatter(frontmatter, bodyContent);
          await fs.writeFile(row.filePath, newContent);
        }
      }
    }

    return {
      success: true,
      column: config.columns[columnIndex],
      message: `Column "${columnId}" updated successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to update column: ${error.message}`);
  }
}

/**
 * Delete a column from a database
 */
export async function deleteColumn(workspaceIdOrPath, databasePath, columnId) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config, fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    // Don't allow deleting title column
    if (columnId === 'title') {
      throw new McpError(ErrorCode.InvalidRequest, 'Cannot delete the title column');
    }

    const columnIndex = config.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) {
      throw new McpError(ErrorCode.InvalidRequest, `Column "${columnId}" not found`);
    }

    // Remove column from config
    const deletedColumn = config.columns.splice(columnIndex, 1)[0];

    // Remove column from filters in views
    config.views = config.views.map(view => ({
      ...view,
      filters: (view.filters || []).filter(f => f.column !== columnId),
      sorts: (view.sorts || []).filter(s => s.column !== columnId)
    }));

    await saveDatabaseConfig(fullPath, config);

    // Remove the column from all rows
    const rows = await getDatabaseRows(fullPath);

    for (const row of rows) {
      const content = await fs.readFile(row.filePath, 'utf-8');
      const { frontmatter, content: bodyContent } = parseMarkdownWithFrontmatter(content);

      if (columnId in frontmatter) {
        delete frontmatter[columnId];
        const newContent = stringifyMarkdownWithFrontmatter(frontmatter, bodyContent);
        await fs.writeFile(row.filePath, newContent);
      }
    }

    return {
      success: true,
      deletedColumn,
      message: `Column "${deletedColumn.name}" deleted successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to delete column: ${error.message}`);
  }
}

// ============================================================================
// View Operations
// ============================================================================

/**
 * Create a new view for a database
 */
export async function createView(workspaceIdOrPath, databasePath, view) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config, fullPath } = await getDatabaseConfig(workspace.path, databasePath);

    // Generate ID from name if not provided
    const viewId = view.id || view.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check if view already exists
    if (config.views.some(v => v.id === viewId)) {
      throw new McpError(ErrorCode.InvalidRequest, `View "${viewId}" already exists`);
    }

    const newView = {
      id: viewId,
      name: view.name,
      type: view.type || 'table',
      filters: view.filters || [],
      sorts: view.sorts || [],
      ...(view.groupBy && { groupBy: view.groupBy }),
      ...(view.rowGroupBy && { rowGroupBy: view.rowGroupBy })
    };

    config.views.push(newView);
    await saveDatabaseConfig(fullPath, config);

    return {
      success: true,
      view: newView,
      message: `View "${view.name}" created successfully`
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to create view: ${error.message}`);
  }
}

/**
 * List all views for a database
 */
export async function listViews(workspaceIdOrPath, databasePath) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const { config } = await getDatabaseConfig(workspace.path, databasePath);

    return {
      database: config.name,
      views: config.views,
      defaultView: config.defaultView,
      count: config.views.length
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to list views: ${error.message}`);
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const databaseTools = [
  // Database Management
  {
    name: 'create_database',
    description: 'Create a new database in a workspace. A database is a folder containing markdown files (rows) with a database.json configuration file.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        name: {
          type: 'string',
          description: 'Name for the new database'
        },
        columns: {
          type: 'array',
          description: 'Column definitions. If not provided, default columns (title, status, tags) will be created.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Column identifier (snake_case recommended)' },
              name: { type: 'string', description: 'Display name for the column' },
              type: {
                type: 'string',
                enum: ['title', 'text', 'number', 'select', 'multiselect', 'checkbox', 'date', 'url'],
                description: 'Column type'
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Options for select/multiselect columns'
              }
            },
            required: ['id', 'name', 'type']
          }
        },
        folderPath: {
          type: 'string',
          description: 'Optional folder path within documents where to create the database'
        }
      },
      required: ['workspace', 'name']
    }
  },
  {
    name: 'read_database',
    description: 'Read a database with optional filtering, sorting, and searching. Returns database config and rows.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder (relative to documents folder)'
        },
        search: {
          type: 'string',
          description: 'Search query to filter rows'
        },
        filters: {
          type: 'array',
          description: 'Column filters to apply',
          items: {
            type: 'object',
            properties: {
              column: { type: 'string', description: 'Column ID to filter on' },
              operator: {
                type: 'string',
                enum: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
                description: 'Filter operator'
              },
              value: { description: 'Filter value' }
            },
            required: ['column', 'operator']
          }
        },
        sort: {
          type: 'object',
          description: 'Sorting configuration',
          properties: {
            column: { type: 'string', description: 'Column ID to sort by' },
            direction: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' }
          },
          required: ['column']
        },
        viewId: {
          type: 'string',
          description: 'View ID to use for pre-configured filters/sorts'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return'
        }
      },
      required: ['workspace', 'databasePath']
    }
  },
  {
    name: 'list_databases',
    description: 'List all databases in a workspace with their metadata and row counts.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        }
      },
      required: ['workspace']
    }
  },
  {
    name: 'delete_database',
    description: 'Delete a database and all its rows. This action is permanent.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder (relative to documents folder)'
        }
      },
      required: ['workspace', 'databasePath']
    }
  },

  // Row Operations
  {
    name: 'add_rows',
    description: 'Add one or more rows to a database. Each row is a markdown file with frontmatter properties.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        rows: {
          description: 'Row data or array of row data. Include "title" for the filename, other properties become frontmatter. Use "_content" for the markdown body.',
          oneOf: [
            {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Row title (becomes filename)' },
                _content: { type: 'string', description: 'Markdown body content' }
              },
              required: ['title'],
              additionalProperties: true
            },
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Row title (becomes filename)' },
                  _content: { type: 'string', description: 'Markdown body content' }
                },
                required: ['title'],
                additionalProperties: true
              }
            }
          ]
        }
      },
      required: ['workspace', 'databasePath', 'rows']
    }
  },
  {
    name: 'update_rows',
    description: 'Update rows by ID (file path) or matching criteria. Can update frontmatter properties and content.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        updates: {
          type: 'object',
          description: 'Properties to update. Use "title" to rename, "_content" to update body.',
          additionalProperties: true
        },
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Row IDs (file paths) to update'
        },
        where: {
          type: 'object',
          description: 'Criteria to match rows for update (e.g., {"status": "Todo"})',
          additionalProperties: true
        }
      },
      required: ['workspace', 'databasePath', 'updates']
    }
  },
  {
    name: 'delete_rows',
    description: 'Delete rows by ID (file path) or matching criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Row IDs (file paths) to delete'
        },
        where: {
          type: 'object',
          description: 'Criteria to match rows for deletion (e.g., {"status": "Archived"})',
          additionalProperties: true
        }
      },
      required: ['workspace', 'databasePath']
    }
  },

  // Column Operations
  {
    name: 'add_column',
    description: 'Add a new column to a database. Optionally set a default value for existing rows.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        column: {
          type: 'object',
          description: 'Column definition',
          properties: {
            id: { type: 'string', description: 'Column identifier (snake_case recommended)' },
            name: { type: 'string', description: 'Display name' },
            type: {
              type: 'string',
              enum: ['title', 'text', 'number', 'select', 'multiselect', 'checkbox', 'date', 'url'],
              description: 'Column type'
            },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Options for select/multiselect columns'
            }
          },
          required: ['id', 'name', 'type']
        },
        defaultValue: {
          description: 'Default value to set for existing rows'
        }
      },
      required: ['workspace', 'databasePath', 'column']
    }
  },
  {
    name: 'update_column',
    description: 'Update column properties (name, type, options). If changing column ID, all rows will be updated.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        columnId: {
          type: 'string',
          description: 'ID of the column to update'
        },
        updates: {
          type: 'object',
          description: 'Properties to update',
          properties: {
            id: { type: 'string', description: 'New column ID' },
            name: { type: 'string', description: 'New display name' },
            type: {
              type: 'string',
              enum: ['title', 'text', 'number', 'select', 'multiselect', 'checkbox', 'date', 'url']
            },
            options: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      },
      required: ['workspace', 'databasePath', 'columnId', 'updates']
    }
  },
  {
    name: 'delete_column',
    description: 'Remove a column from a database. The column data will be removed from all rows.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        columnId: {
          type: 'string',
          description: 'ID of the column to delete'
        }
      },
      required: ['workspace', 'databasePath', 'columnId']
    }
  },

  // View Operations
  {
    name: 'create_view',
    description: 'Create a saved view with filters, sorts, and display options.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        },
        view: {
          type: 'object',
          description: 'View configuration',
          properties: {
            id: { type: 'string', description: 'View ID (auto-generated from name if not provided)' },
            name: { type: 'string', description: 'View display name' },
            type: {
              type: 'string',
              enum: ['table', 'kanban', 'gallery', 'chart'],
              description: 'View type'
            },
            filters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string', enum: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'] },
                  value: {}
                },
                required: ['column', 'operator']
              }
            },
            sorts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  direction: { type: 'string', enum: ['asc', 'desc'] }
                },
                required: ['column', 'direction']
              }
            },
            groupBy: { type: 'string', description: 'Column ID to group by (for kanban view)' },
            rowGroupBy: { type: 'string', description: 'Column ID for row grouping (for kanban view)' }
          },
          required: ['name']
        }
      },
      required: ['workspace', 'databasePath', 'view']
    }
  },
  {
    name: 'list_views',
    description: 'List all saved views for a database.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        databasePath: {
          type: 'string',
          description: 'Path to the database folder'
        }
      },
      required: ['workspace', 'databasePath']
    }
  }
];

// ============================================================================
// Tool Handlers
// ============================================================================

export const databaseHandlers = {
  // Database Management
  create_database: async (args) =>
    createDatabase(args.workspace, args.name, args.columns, args.folderPath),

  read_database: async (args) =>
    readDatabase(args.workspace, args.databasePath, {
      search: args.search,
      filters: args.filters,
      sort: args.sort,
      viewId: args.viewId,
      limit: args.limit
    }),

  list_databases: async (args) =>
    listDatabases(args.workspace),

  delete_database: async (args) =>
    deleteDatabase(args.workspace, args.databasePath),

  // Row Operations
  add_rows: async (args) =>
    addRows(args.workspace, args.databasePath, args.rows),

  update_rows: async (args) =>
    updateRows(args.workspace, args.databasePath, args.updates, {
      ids: args.ids,
      where: args.where
    }),

  delete_rows: async (args) =>
    deleteRows(args.workspace, args.databasePath, {
      ids: args.ids,
      where: args.where
    }),

  // Column Operations
  add_column: async (args) =>
    addColumn(args.workspace, args.databasePath, args.column, args.defaultValue),

  update_column: async (args) =>
    updateColumn(args.workspace, args.databasePath, args.columnId, args.updates),

  delete_column: async (args) =>
    deleteColumn(args.workspace, args.databasePath, args.columnId),

  // View Operations
  create_view: async (args) =>
    createView(args.workspace, args.databasePath, args.view),

  list_views: async (args) =>
    listViews(args.workspace, args.databasePath)
};
