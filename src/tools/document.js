import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { 
  readRegistry, 
  writeRegistry, 
  getDocumentPath, 
  ensureDirectory,
  generateFileName,
  resolveWorkspace 
} from '../utils/helpers.js';

/**
 * Read a specific document
 */
export async function readDocument(workspaceIdOrPath, documentId) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const docPath = await getDocumentPath(workspace.path, documentId);
    
    const content = await fs.readFile(docPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    
    // Get document metadata from registry
    const registry = await readRegistry(workspace.path);
    const metadata = registry.documents.find(d => 
      d.id === documentId || 
      d.name === documentId || 
      d.fileName === documentId ||
      d.fileName === `${documentId}.md` ||
      d.path === `documents/${documentId}.md` ||
      d.path === `documents/${documentId}`
    );
    
    return {
      workspace,
      documentId,
      metadata,
      frontmatter,
      content: body
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to read document: ${error.message}`);
  }
}

/**
 * Add a new document
 */
export async function addDocument(workspaceIdOrPath, title, content = '', tags = [], folder = null, aiModel = null, aiNote = null, emoji = null) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const documentsPath = path.join(workspace.path, 'documents');
    
    // Handle folder paths - create subdirectories if specified
    let targetPath = documentsPath;
    let relativePath = '';
    if (folder) {
      // Sanitize folder path to prevent directory traversal
      const sanitizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '');
      targetPath = path.join(documentsPath, sanitizedFolder);
      relativePath = sanitizedFolder;
      // Ensure the folder exists
      await ensureDirectory(targetPath);
    }
    
    // Generate document ID and filename
    const documentId = Date.now().toString();
    const fileName = generateFileName(title);
    const filePath = path.join(targetPath, fileName);
    
    // Format creation date
    const creationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Build document header
    let documentHeader = '';
    if (aiModel || aiNote) {
      documentHeader = `### This document was added on ${creationDate}${aiModel ? ` by ${aiModel}` : ''}\n`;
      if (aiNote) {
        documentHeader += `AI Note: ${aiNote}\n`;
      }
      documentHeader += '\n---\n\n';
    }
    
    // Create document content WITHOUT frontmatter
    const fullContent = documentHeader + content;
    
    // Write document file without frontmatter
    await fs.writeFile(filePath, fullContent);
    
    // Update registry
    const registry = await readRegistry(workspace.path);
    registry.documents.push({
      id: documentId,
      fileName,
      path: relativePath ? path.join('documents', relativePath, fileName) : path.join('documents', fileName),
      title,
      tags,
      folder: relativePath || null,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      aiModel: aiModel || undefined,
      aiNote: aiNote || undefined,
      emoji: emoji || '🌵'  // Default to cactus emoji if not provided
    });
    
    await writeRegistry(workspace.path, registry);
    
    return {
      success: true,
      documentId,
      fileName,
      path: relativePath ? path.join(relativePath, fileName) : fileName,
      message: `Document "${title}" created successfully${relativePath ? ` in folder "${relativePath}"` : ''}`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to add document: ${error.message}`);
  }
}

/**
 * Rename a document
 */
export async function renameDocument(workspaceIdOrPath, documentId, newTitle) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const oldPath = await getDocumentPath(workspace.path, documentId);
    
    // Generate new filename
    const newFileName = generateFileName(newTitle);
    const newPath = path.join(workspace.path, 'documents', newFileName);
    
    // Read existing content (keep it as-is without adding frontmatter)
    const content = await fs.readFile(oldPath, 'utf-8');
    
    // Write content to new file without any modifications
    await fs.writeFile(newPath, content);
    
    // Delete old file
    await fs.unlink(oldPath);
    
    // Update registry
    const registry = await readRegistry(workspace.path);
    const docIndex = registry.documents.findIndex(d => d.id === documentId);
    if (docIndex !== -1) {
      registry.documents[docIndex].fileName = newFileName;
      registry.documents[docIndex].title = newTitle;
      registry.documents[docIndex].modified = new Date().toISOString();
      await writeRegistry(workspace.path, registry);
    }
    
    return {
      success: true,
      documentId,
      newFileName,
      message: `Document renamed to "${newTitle}"`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to rename document: ${error.message}`);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(workspaceIdOrPath, documentId) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const docPath = await getDocumentPath(workspace.path, documentId);
    
    // Delete file
    await fs.unlink(docPath);
    
    // Update registry
    const registry = await readRegistry(workspace.path);
    registry.documents = registry.documents.filter(d => d.id !== documentId);
    await writeRegistry(workspace.path, registry);
    
    return {
      success: true,
      documentId,
      message: 'Document deleted successfully'
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to delete document: ${error.message}`);
  }
}

// Tool definitions
export const documentTools = [
  {
    name: 'read_document',
    description: 'Read a specific document',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path/name'
        },
        documentId: {
          type: 'string',
          description: 'Document ID from registry'
        }
      },
      required: ['workspace', 'documentId']
    }
  },
  {
    name: 'add_document',
    description: 'Create a new document in a workspace, optionally in a specific folder',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path/name'
        },
        title: {
          type: 'string',
          description: 'Document title'
        },
        content: {
          type: 'string',
          description: 'Document content (markdown)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Document tags'
        },
        folder: {
          type: 'string',
          description: 'Folder path within documents directory (e.g., "projects/2024" or "notes"). Creates folder if it doesn\'t exist.'
        },
        aiModel: {
          type: 'string',
          description: 'AI model that created this document (e.g., "Claude 3.5 Sonnet")'
        },
        aiNote: {
          type: 'string',
          description: 'Note about the creation of this document'
        },
        emoji: {
          type: 'string',
          description: 'Emoji to display next to the document in the sidebar (e.g., "📄", "📝", "💡", "🔍", "📚", "🎯")'
        }
      },
      required: ['workspace', 'title']
    }
  },
  {
    name: 'rename_document',
    description: 'Rename a document',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string'
        },
        documentId: {
          type: 'string'
        },
        newTitle: {
          type: 'string'
        }
      },
      required: ['workspace', 'documentId', 'newTitle']
    }
  },
  {
    name: 'delete_document',
    description: 'Delete a document. IMPORTANT: You must provide the full document path from the registry (e.g., "documents/my-document.md" or "documents/folder/my-document.md")',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path/name'
        },
        documentId: {
          type: 'string',
          description: 'Full document path from registry (e.g., "documents/my-document.md"). MUST be the complete path including "documents/" prefix and file extension.'
        }
      },
      required: ['workspace', 'documentId']
    }
  }
];

// Tool handlers
export const documentHandlers = {
  read_document: async (args) => 
    readDocument(args.workspace, args.documentId),
  
  add_document: async (args) => 
    addDocument(args.workspace, args.title, args.content, args.tags, args.folder, args.aiModel, args.aiNote, args.emoji),
  
  rename_document: async (args) => 
    renameDocument(args.workspace, args.documentId, args.newTitle),
  
  delete_document: async (args) => 
    deleteDocument(args.workspace, args.documentId)
};