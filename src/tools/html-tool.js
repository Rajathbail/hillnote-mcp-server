/**
 * HTML tool management for MCP server
 * Handles creation and integration of HTML-based tools in workspaces
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * HTML tool definitions for MCP
 */
export const htmlToolTools = [
  {
    name: 'add_html_tool',
    description: 'Create a new HTML tool in the workspace resources/html directory',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        toolName: {
          type: 'string',
          description: 'Name of the HTML tool (will be used as folder name)'
        },
        description: {
          type: 'string',
          description: 'Brief description of what this HTML tool does'
        },
        files: {
          type: 'array',
          description: 'Array of files to create for this tool',
          items: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'Name of the file (e.g., index.html, styles.css)'
              },
              content: {
                type: 'string',
                description: 'Content of the file while keeping the HTML mobile-optimized'
              },
              isEntryPoint: {
                type: 'boolean',
                description: 'Whether this is the main entry point file (default: false, true for index.html)'
              }
            },
            required: ['filename', 'content']
          }
        },
        category: {
          type: 'string',
          description: 'Optional category for organizing tools (e.g., "games", "utilities", "visualizations")'
        }
      },
      required: ['workspacePath', 'toolName', 'files']
    }
  },
  {
    name: 'add_tool_to_doc',
    description: 'Insert an HTML tool reference into a document',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        documentPath: {
          type: 'string',
          description: 'Path to the document file (relative to workspace)'
        },
        toolName: {
          type: 'string',
          description: 'Name of the HTML tool to insert'
        },
        displayName: {
          type: 'string',
          description: 'Display name for the tool link (defaults to toolName)'
        },
        category: {
          type: 'string',
          description: 'Optional category where the tool is located'
        },
        position: {
          type: 'string',
          description: 'Where to insert the tool reference: "end" (default), "beginning", or "after:<text>"'
        }
      },
      required: ['workspacePath', 'documentPath', 'toolName']
    }
  },
  {
    name: 'edit_html_tool',
    description: 'Edit files in an existing HTML tool',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        toolName: {
          type: 'string',
          description: 'Name of the HTML tool to edit'
        },
        category: {
          type: 'string',
          description: 'Optional category where the tool is located'
        },
        operations: {
          type: 'array',
          description: 'Array of file operations to perform',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['create', 'update', 'delete'],
                description: 'Operation to perform on the file'
              },
              filename: {
                type: 'string',
                description: 'Name of the file to operate on'
              },
              content: {
                type: 'string',
                description: 'New content for the file (required for create/update)'
              },
              isEntryPoint: {
                type: 'boolean',
                description: 'Whether this should become the new entry point'
              }
            },
            required: ['action', 'filename']
          }
        },
        updateMetadata: {
          type: 'object',
          description: 'Optional metadata updates',
          properties: {
            description: {
              type: 'string',
              description: 'New description for the tool'
            },
            entryPoint: {
              type: 'string',
              description: 'New entry point file'
            }
          }
        }
      },
      required: ['workspacePath', 'toolName', 'operations']
    }
  },
  {
    name: 'list_html_tools',
    description: 'List all HTML tools available in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        category: {
          type: 'string',
          description: 'Optional category to filter tools'
        }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_html_tool',
    description: 'Get details and files of a specific HTML tool',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        toolName: {
          type: 'string',
          description: 'Name of the HTML tool'
        },
        category: {
          type: 'string',
          description: 'Optional category where the tool is located'
        }
      },
      required: ['workspacePath', 'toolName']
    }
  }
];

/**
 * Helper function to ensure directory exists
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Helper function to find the entry point file
 */
function findEntryPoint(files) {
  // First check if any file is explicitly marked as entry point
  const explicitEntry = files.find(f => f.isEntryPoint);
  if (explicitEntry) return explicitEntry.filename;
  
  // Otherwise look for common entry point names
  const commonEntryPoints = ['index.html', 'main.html', 'app.html', 'tool.html'];
  for (const name of commonEntryPoints) {
    if (files.some(f => f.filename === name)) {
      return name;
    }
  }
  
  // If no common entry point, use the first HTML file
  const firstHtml = files.find(f => f.filename.endsWith('.html'));
  if (firstHtml) return firstHtml.filename;
  
  // Fallback to first file
  return files[0]?.filename || 'index.html';
}

/**
 * Helper function to generate the markdown link for an HTML tool
 */
function generateToolLink(toolName, displayName, category, entryPoint) {
  const display = displayName || toolName;
  const toolPath = category 
    ? `resources/html/${category}/${toolName}/${entryPoint}`
    : `resources/html/${toolName}/${entryPoint}`;
  
  return `[html:${display}](${toolPath})`;
}

/**
 * HTML tool handlers
 */
export const htmlToolHandlers = {
  add_html_tool: async ({ workspacePath, toolName, description, files, category }) => {
    try {
      // Validate tool name (no special characters that could cause issues)
      if (!/^[a-zA-Z0-9_-]+$/.test(toolName)) {
        return {
          success: false,
          error: 'Tool name must contain only letters, numbers, underscores, and hyphens'
        };
      }
      
      // Construct the tool directory path
      const htmlBasePath = path.join(workspacePath, 'resources', 'html');
      const toolDir = category 
        ? path.join(htmlBasePath, category, toolName)
        : path.join(htmlBasePath, toolName);
      
      // Check if tool already exists
      try {
        await fs.access(toolDir);
        return {
          success: false,
          error: `HTML tool '${toolName}' already exists${category ? ` in category '${category}'` : ''}`
        };
      } catch {
        // Directory doesn't exist, which is what we want
      }
      
      // Create the directory structure
      await ensureDirectory(toolDir);
      
      // Write all files
      const createdFiles = [];
      for (const file of files) {
        const filePath = path.join(toolDir, file.filename);
        
        // Ensure subdirectories exist if filename contains paths
        const fileDir = path.dirname(filePath);
        if (fileDir !== toolDir) {
          await ensureDirectory(fileDir);
        }
        
        await fs.writeFile(filePath, file.content, 'utf-8');
        createdFiles.push(file.filename);
      }
      
      // Find the entry point
      const entryPoint = findEntryPoint(files);
      
      // Create a metadata file for the tool
      const metadata = {
        name: toolName,
        description: description || `HTML tool: ${toolName}`,
        category: category || null,
        entryPoint,
        files: createdFiles,
        createdAt: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(toolDir, 'tool.meta.json'),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
      
      return {
        success: true,
        message: `HTML tool '${toolName}' created successfully`,
        path: toolDir.replace(workspacePath, '').replace(/^\//, ''),
        entryPoint,
        filesCreated: createdFiles.length,
        markdownLink: generateToolLink(toolName, null, category, entryPoint)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create HTML tool: ${error.message}`
      };
    }
  },

  edit_html_tool: async ({ workspacePath, toolName, category, operations, updateMetadata }) => {
    try {
      // Construct the tool directory path
      const htmlBasePath = path.join(workspacePath, 'resources', 'html');
      const toolDir = category 
        ? path.join(htmlBasePath, category, toolName)
        : path.join(htmlBasePath, toolName);
      
      // Check if tool exists
      try {
        await fs.access(toolDir);
      } catch {
        return {
          success: false,
          error: `HTML tool '${toolName}' not found${category ? ` in category '${category}'` : ''}`
        };
      }
      
      // Load existing metadata
      let metadata = {
        name: toolName,
        category: category || null
      };
      
      try {
        const metadataContent = await fs.readFile(
          path.join(toolDir, 'tool.meta.json'),
          'utf-8'
        );
        metadata = { ...metadata, ...JSON.parse(metadataContent) };
      } catch {
        // No existing metadata
      }
      
      // Track changes
      const changes = {
        created: [],
        updated: [],
        deleted: [],
        errors: []
      };
      
      // Process operations
      for (const op of operations) {
        const filePath = path.join(toolDir, op.filename);
        
        try {
          switch (op.action) {
            case 'create':
              if (!op.content && op.content !== '') {
                changes.errors.push(`Cannot create ${op.filename}: content is required`);
                continue;
              }
              
              // Ensure subdirectories exist if filename contains paths
              const fileDir = path.dirname(filePath);
              if (fileDir !== toolDir) {
                await ensureDirectory(fileDir);
              }
              
              // Check if file already exists
              try {
                await fs.access(filePath);
                changes.errors.push(`File ${op.filename} already exists`);
                continue;
              } catch {
                // File doesn't exist, good to create
              }
              
              await fs.writeFile(filePath, op.content, 'utf-8');
              changes.created.push(op.filename);
              
              // Update entry point if specified
              if (op.isEntryPoint) {
                metadata.entryPoint = op.filename;
              }
              break;
              
            case 'update':
              if (!op.content && op.content !== '') {
                changes.errors.push(`Cannot update ${op.filename}: content is required`);
                continue;
              }
              
              // Check if file exists
              try {
                await fs.access(filePath);
              } catch {
                changes.errors.push(`File ${op.filename} not found`);
                continue;
              }
              
              await fs.writeFile(filePath, op.content, 'utf-8');
              changes.updated.push(op.filename);
              
              // Update entry point if specified
              if (op.isEntryPoint) {
                metadata.entryPoint = op.filename;
              }
              break;
              
            case 'delete':
              try {
                await fs.unlink(filePath);
                changes.deleted.push(op.filename);
                
                // If deleted file was entry point, find a new one
                if (metadata.entryPoint === op.filename) {
                  const files = await fs.readdir(toolDir);
                  const htmlFile = files.find(f => f.endsWith('.html') && f !== op.filename);
                  metadata.entryPoint = htmlFile || 'index.html';
                }
              } catch (error) {
                changes.errors.push(`Failed to delete ${op.filename}: ${error.message}`);
              }
              break;
              
            default:
              changes.errors.push(`Unknown action '${op.action}' for ${op.filename}`);
          }
        } catch (error) {
          changes.errors.push(`Error processing ${op.filename}: ${error.message}`);
        }
      }
      
      // Update metadata if provided
      if (updateMetadata) {
        if (updateMetadata.description !== undefined) {
          metadata.description = updateMetadata.description;
        }
        if (updateMetadata.entryPoint !== undefined) {
          // Verify the entry point exists
          try {
            await fs.access(path.join(toolDir, updateMetadata.entryPoint));
            metadata.entryPoint = updateMetadata.entryPoint;
          } catch {
            changes.errors.push(`Entry point file '${updateMetadata.entryPoint}' not found`);
          }
        }
      }
      
      // Update metadata file
      metadata.lastModified = new Date().toISOString();
      await fs.writeFile(
        path.join(toolDir, 'tool.meta.json'),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
      
      return {
        success: changes.errors.length === 0,
        message: `HTML tool '${toolName}' edited`,
        changes,
        metadata: {
          name: metadata.name,
          description: metadata.description,
          entryPoint: metadata.entryPoint,
          category: metadata.category
        },
        markdownLink: generateToolLink(toolName, null, category, metadata.entryPoint)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to edit HTML tool: ${error.message}`
      };
    }
  },

  add_tool_to_doc: async ({ workspacePath, documentPath, toolName, displayName, category, position = 'end' }) => {
    try {
      // Construct the tool directory path to verify it exists
      const htmlBasePath = path.join(workspacePath, 'resources', 'html');
      const toolDir = category 
        ? path.join(htmlBasePath, category, toolName)
        : path.join(htmlBasePath, toolName);
      
      // Check if tool exists and get metadata
      let entryPoint = 'index.html';
      try {
        const metadataPath = path.join(toolDir, 'tool.meta.json');
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        entryPoint = metadata.entryPoint || 'index.html';
      } catch {
        // Try to find any HTML file if metadata doesn't exist
        try {
          const files = await fs.readdir(toolDir);
          const htmlFile = files.find(f => f.endsWith('.html'));
          if (htmlFile) {
            entryPoint = htmlFile;
          }
        } catch (error) {
          return {
            success: false,
            error: `HTML tool '${toolName}' not found${category ? ` in category '${category}'` : ''}`
          };
        }
      }
      
      // Read the document
      const docFullPath = path.join(workspacePath, documentPath);
      let docContent;
      try {
        docContent = await fs.readFile(docFullPath, 'utf-8');
      } catch (error) {
        return {
          success: false,
          error: `Document not found: ${documentPath}`
        };
      }
      
      // Generate the tool link
      const toolLink = generateToolLink(toolName, displayName, category, entryPoint);
      
      // Insert the link based on position
      let newContent;
      if (position === 'beginning') {
        newContent = toolLink + '\n\n' + docContent;
      } else if (position === 'end') {
        newContent = docContent + '\n\n' + toolLink;
      } else if (position.startsWith('after:')) {
        const afterText = position.substring(6);
        const index = docContent.indexOf(afterText);
        if (index === -1) {
          return {
            success: false,
            error: `Could not find text "${afterText}" in document`
          };
        }
        const insertIndex = index + afterText.length;
        newContent = docContent.slice(0, insertIndex) + '\n\n' + toolLink + docContent.slice(insertIndex);
      } else {
        newContent = docContent + '\n\n' + toolLink;
      }
      
      // Write the updated document
      await fs.writeFile(docFullPath, newContent, 'utf-8');
      
      return {
        success: true,
        message: `HTML tool reference added to document`,
        documentPath,
        toolLink,
        position
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add tool to document: ${error.message}`
      };
    }
  },

  list_html_tools: async ({ workspacePath, category }) => {
    try {
      const htmlBasePath = path.join(workspacePath, 'resources', 'html');
      const tools = [];
      
      // Ensure the html directory exists
      try {
        await fs.access(htmlBasePath);
      } catch {
        // Directory doesn't exist yet
        return {
          success: true,
          tools: [],
          total: 0,
          message: 'No HTML tools directory found'
        };
      }
      
      // Function to scan a directory for tools
      async function scanForTools(dirPath, currentCategory = null) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(dirPath, entry.name);
            
            // Check if this directory is a tool (has HTML files or metadata)
            try {
              const subEntries = await fs.readdir(fullPath);
              const hasHtmlFiles = subEntries.some(f => f.endsWith('.html'));
              const hasMetadata = subEntries.includes('tool.meta.json');
              
              if (hasHtmlFiles || hasMetadata) {
                // This is a tool directory
                let toolInfo = {
                  name: entry.name,
                  category: currentCategory,
                  path: fullPath.replace(workspacePath, '').replace(/^\//, '')
                };
                
                // Try to load metadata
                if (hasMetadata) {
                  try {
                    const metadataContent = await fs.readFile(
                      path.join(fullPath, 'tool.meta.json'),
                      'utf-8'
                    );
                    const metadata = JSON.parse(metadataContent);
                    toolInfo = { ...toolInfo, ...metadata };
                  } catch {
                    // Ignore metadata errors
                  }
                }
                
                // Find entry point if not in metadata
                if (!toolInfo.entryPoint) {
                  const htmlFile = subEntries.find(f => f.endsWith('.html'));
                  toolInfo.entryPoint = htmlFile || 'index.html';
                }
                
                // Add markdown link
                toolInfo.markdownLink = generateToolLink(
                  toolInfo.name,
                  null,
                  toolInfo.category,
                  toolInfo.entryPoint
                );
                
                // Only include if category matches (or no category filter)
                if (!category || currentCategory === category) {
                  tools.push(toolInfo);
                }
              } else {
                // This might be a category directory, scan it recursively
                await scanForTools(fullPath, entry.name);
              }
            } catch {
              // Ignore directories we can't read
            }
          }
        }
      }
      
      await scanForTools(htmlBasePath);
      
      return {
        success: true,
        tools,
        total: tools.length,
        category: category || 'all'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list HTML tools: ${error.message}`
      };
    }
  },

  get_html_tool: async ({ workspacePath, toolName, category }) => {
    try {
      const htmlBasePath = path.join(workspacePath, 'resources', 'html');
      const toolDir = category 
        ? path.join(htmlBasePath, category, toolName)
        : path.join(htmlBasePath, toolName);
      
      // Check if tool exists
      try {
        await fs.access(toolDir);
      } catch {
        return {
          success: false,
          error: `HTML tool '${toolName}' not found${category ? ` in category '${category}'` : ''}`
        };
      }
      
      // Load metadata if available
      let metadata = {
        name: toolName,
        category: category || null
      };
      
      try {
        const metadataContent = await fs.readFile(
          path.join(toolDir, 'tool.meta.json'),
          'utf-8'
        );
        metadata = { ...metadata, ...JSON.parse(metadataContent) };
      } catch {
        // No metadata file
      }
      
      // List all files in the tool directory
      const files = [];
      async function scanDir(dirPath, relativePath = '') {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          
          if (entry.isFile() && entry.name !== 'tool.meta.json') {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({
              filename: relPath,
              content,
              size: content.length,
              isEntryPoint: relPath === metadata.entryPoint
            });
          } else if (entry.isDirectory()) {
            await scanDir(fullPath, relPath);
          }
        }
      }
      
      await scanDir(toolDir);
      
      // Find entry point if not in metadata
      if (!metadata.entryPoint) {
        metadata.entryPoint = findEntryPoint(files);
      }
      
      return {
        success: true,
        tool: {
          ...metadata,
          path: toolDir.replace(workspacePath, '').replace(/^\//, ''),
          markdownLink: generateToolLink(toolName, null, category, metadata.entryPoint),
          files,
          totalFiles: files.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get HTML tool: ${error.message}`
      };
    }
  }
};