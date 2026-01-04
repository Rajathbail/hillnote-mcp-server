import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Get the workspaces.json file path
 */
export function getWorkspacesJsonPath() {
  return path.join(os.homedir(), 'Library', 'Application Support', 'Hillnote', 'workspaces.json');
}

/**
 * Resolve a workspace identifier to its actual path
 * @param {string} workspaceIdOrPath - Either workspace ID, name, or path
 * @returns {Promise<{path: string, name: string, id: string}>}
 */
export async function resolveWorkspace(workspaceIdOrPath) {
  // If it's already a full path, return it
  if (workspaceIdOrPath.startsWith('/') || workspaceIdOrPath.includes('\\')) {
    return {
      path: workspaceIdOrPath,
      name: path.basename(workspaceIdOrPath),
      id: null
    };
  }
  
  // Otherwise, look it up in workspaces.json
  try {
    const workspacesJsonPath = getWorkspacesJsonPath();
    const data = await fs.readFile(workspacesJsonPath, 'utf-8');
    const workspaces = JSON.parse(data);
    
    // Find by ID or name
    const workspace = workspaces.find(ws => 
      ws.id === workspaceIdOrPath || 
      ws.name === workspaceIdOrPath
    );
    
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
    
    return {
      path: workspace.path,
      name: workspace.name,
      id: workspace.id
    };
  } catch (error) {
    throw new Error(`Failed to resolve workspace: ${error.message}`);
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Read the document registry for a workspace
 */
export async function readRegistry(workspacePath) {
  const registryPath = path.join(workspacePath, 'documents-registry.json');
  try {
    const data = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty registry if file doesn't exist
    return { documents: [], folders: [] };
  }
}

/**
 * Write the document registry for a workspace
 */
export async function writeRegistry(workspacePath, registry) {
  const registryPath = path.join(workspacePath, 'documents-registry.json');
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Get the full path to a document file
 */
export async function getDocumentPath(workspacePath, documentId) {
  const registry = await readRegistry(workspacePath);
  
  // Try to find by id first, then by name, then check if it's a filename
  let doc = registry.documents.find(d => 
    d.id === documentId || 
    d.name === documentId || 
    d.fileName === documentId ||
    d.fileName === `${documentId}.md`
  );
  
  if (!doc) {
    // If not found, check if the documentId itself is the filename
    const possibleFilename = documentId.endsWith('.md') ? documentId : `${documentId}.md`;
    doc = registry.documents.find(d => 
      d.path === `documents/${possibleFilename}` ||
      d.path === possibleFilename
    );
  }
  
  if (!doc) {
    // Get list of available documents to help the user
    const availableDocs = registry.documents.map(d => ({
      name: d.name || d.title,
      id: d.id,
      fileName: d.fileName
    }));
    
    const errorMessage = `Document "${documentId}" not found in workspace.\n\nAvailable documents:\n${
      availableDocs.length > 0 
        ? availableDocs.slice(0, 10).map(d => `- "${d.name}" (id: ${d.id})`).join('\n') +
          (availableDocs.length > 10 ? `\n... and ${availableDocs.length - 10} more documents` : '')
        : 'No documents found in this workspace.'
    }\n\nTip: Use 'read_registry' tool first to see all documents with their IDs and titles.`;
    
    throw new Error(errorMessage);
  }
  
  // Handle different registry formats
  if (doc.path) {
    // New format with path field
    return path.join(workspacePath, doc.path);
  } else if (doc.fileName) {
    // Old format with fileName field
    return path.join(workspacePath, 'documents', doc.fileName);
  } else {
    // Fallback: construct from name
    const fileName = doc.name.endsWith('.md') ? doc.name : `${doc.name}.md`;
    return path.join(workspacePath, 'documents', fileName);
  }
}

/**
 * Read workspace metadata from readme.md
 */
export async function readWorkspaceMetadata(workspacePath) {
  let name = path.basename(workspacePath);
  let overview = '';
  
  try {
    const readmePath = path.join(workspacePath, 'readme.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    
    const nameMatch = readmeContent.match(/^#\s+(.+)$/m);
    if (nameMatch) name = nameMatch[1].trim();
    
    const purposeMatch = readmeContent.match(/\*\*Purpose:\*\*\s+(.+)$/m);
    if (purposeMatch) overview = purposeMatch[1].trim();
  } catch (error) {
    // Ignore if readme doesn't exist
  }
  
  return { name, overview };
}

/**
 * Generate a safe filename from a title
 * Handles special extensions like .slides.md
 */
export function generateFileName(title) {
  // Check if this is a slides file (ends with .slides.md or .slides)
  const isSlidesFile = title.toLowerCase().endsWith('.slides.md') || title.toLowerCase().endsWith('.slides');

  // Remove the extension for processing
  let baseName = title;
  if (isSlidesFile) {
    if (title.toLowerCase().endsWith('.slides.md')) {
      baseName = title.slice(0, -10); // Remove '.slides.md'
    } else {
      baseName = title.slice(0, -7); // Remove '.slides'
    }
  } else if (title.toLowerCase().endsWith('.md')) {
    baseName = title.slice(0, -3); // Remove '.md'
  }

  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Add back the appropriate extension
  return isSlidesFile ? `${sanitized}.slides.md` : `${sanitized}.md`;
}