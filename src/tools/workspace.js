import fs from 'fs/promises';
import path from 'path';
import { readRegistry, readWorkspaceMetadata, getWorkspacesJsonPath } from '../utils/helpers.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * List all available workspaces from workspaces.json
 */
export async function listWorkspaces() {
  try {
    const workspacesJsonPath = getWorkspacesJsonPath();
    
    // Read workspaces.json
    let workspaces = [];
    try {
      const data = await fs.readFile(workspacesJsonPath, 'utf-8');
      workspaces = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or can't be read, return empty list
      console.error('Error reading workspaces.json:', error);
      return { workspaces: [] };
    }
    
    // Process each workspace
    const workspaceList = await Promise.all(
      workspaces.map(async (workspace) => {
        try {
          // Get document count from registry if it exists
          const registry = await readRegistry(workspace.path);
          const documentCount = registry.documents?.length || 0;
          
          return {
            id: workspace.id,
            path: workspace.path,
            name: workspace.name,
            overview: workspace.overview || '',
            documentCount,
            createdAt: workspace.createdAt,
            lastOpened: workspace.lastOpened
          };
        } catch (error) {
          // If we can't read the workspace, still include it with defaults
          console.error(`Error processing workspace ${workspace.name}:`, error);
          return {
            id: workspace.id,
            path: workspace.path,
            name: workspace.name,
            overview: workspace.overview || '',
            documentCount: 0,
            createdAt: workspace.createdAt,
            lastOpened: workspace.lastOpened
          };
        }
      })
    );
    
    return {
      workspaces: workspaceList
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to list workspaces: ${error.message}`);
  }
}

/**
 * Read document registry for a workspace
 * @param {string} workspaceIdOrPath - Either workspace ID or path
 */
export async function readWorkspaceRegistry(workspaceIdOrPath) {
  try {
    let workspacePath;
    let workspaceName;
    
    // Check if it's a workspace ID or a path
    if (workspaceIdOrPath.startsWith('/') || workspaceIdOrPath.includes('\\')) {
      // It's a path
      workspacePath = workspaceIdOrPath;
      workspaceName = path.basename(workspacePath);
    } else {
      // It's an ID, need to look it up
      const workspacesJsonPath = getWorkspacesJsonPath();
      const data = await fs.readFile(workspacesJsonPath, 'utf-8');
      const workspaces = JSON.parse(data);
      const workspace = workspaces.find(ws => ws.id === workspaceIdOrPath || ws.name === workspaceIdOrPath);
      
      if (!workspace) {
        // List available workspaces to help the user
        const availableWorkspaces = workspaces.map(ws => ({
          name: ws.name,
          path: ws.path,
          id: ws.id
        }));
        
        const errorMessage = `Workspace not found: "${workspaceIdOrPath}"\n\nAvailable workspaces:\n${
          availableWorkspaces.map(ws => `- Name: "${ws.name}", Path: "${ws.path}"`).join('\n')
        }\n\nPlease use one of the available workspace paths or names listed above.`;
        
        throw new Error(errorMessage);
      }
      
      workspacePath = workspace.path;
      workspaceName = workspace.name;
    }
    
    const registry = await readRegistry(workspacePath);
    
    return {
      workspace: workspaceName,
      path: workspacePath,
      registry
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to read registry: ${error.message}`);
  }
}

// Tool definitions
export const workspaceTools = [
  {
    name: 'list_workspaces',
    description: 'List all available workspaces',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'read_registry',
    description: 'Get complete workspace overview: list all documents with titles, descriptions, folder structure, emojis, modification dates, and document relationships. Essential for understanding workspace organization, finding documents by description, navigating folder hierarchy, and discovering document connections. Returns metadata for all documents and folders without reading actual content.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path/name'
        }
      },
      required: ['workspace']
    }
  }
];

// Tool handlers
export const workspaceHandlers = {
  list_workspaces: async () => listWorkspaces(),
  read_registry: async (args) => readWorkspaceRegistry(args.workspace)
};