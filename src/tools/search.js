import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import Fuse from 'fuse.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { resolveWorkspace, getWorkspacesJsonPath } from '../utils/helpers.js';

/**
 * Helper function to determine where the match occurred
 */
function determineMatchType(doc, query) {
  const queryLower = query.toLowerCase();
  const matchLocations = [];
  
  if (doc.documentId && doc.documentId.toLowerCase().includes(queryLower)) {
    matchLocations.push('filename');
  }
  if (doc.title && doc.title.toLowerCase().includes(queryLower)) {
    matchLocations.push('title');
  }
  if (doc.headings && doc.headings.some(h => h.toLowerCase().includes(queryLower))) {
    matchLocations.push('heading');
  }
  if (doc.tags && doc.tags.some(t => t.toLowerCase().includes(queryLower))) {
    matchLocations.push('tag');
  }
  if (doc.body && doc.body.toLowerCase().includes(queryLower)) {
    matchLocations.push('content');
  }
  
  return matchLocations.length > 0 ? matchLocations.join(', ') : 'fuzzy match';
}

/**
 * Search documents across workspaces or in a specific workspace
 */
export async function searchDocuments(query, workspaceIdOrPath, useFuzzy = true, threshold = 0.4) {
  try {
    let searchPaths = [];
    
    if (workspaceIdOrPath) {
      // Search in specific workspace
      const workspace = await resolveWorkspace(workspaceIdOrPath);
      searchPaths = [{
        path: workspace.path,
        name: workspace.name
      }];
    } else {
      // Search across all workspaces
      const workspacesJsonPath = getWorkspacesJsonPath();
      const data = await fs.readFile(workspacesJsonPath, 'utf-8');
      const workspaces = JSON.parse(data);
      searchPaths = workspaces.map(ws => ({
        path: ws.path,
        name: ws.name
      }));
    }
    
    const allDocuments = [];
    
    for (const workspace of searchPaths) {
      const mdFiles = await glob('documents/*.md', {
        cwd: workspace.path,
        ignore: ['node_modules/**', '.*/**']
      });
      
      for (const mdFile of mdFiles) {
        const fullPath = path.join(workspace.path, mdFile);
        const content = await fs.readFile(fullPath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        // Extract document ID from filename (without .md extension)
        const documentId = path.basename(mdFile, '.md');
        
        // Extract headings from the body (H1, H2, H3)
        const headings = [];
        const headingRegex = /^#{1,3}\s+(.+)$/gm;
        let match;
        while ((match = headingRegex.exec(body)) !== null) {
          headings.push(match[1].trim());
        }
        
        allDocuments.push({
          workspace: workspace.name,
          fileName: path.basename(mdFile),
          documentId: documentId,
          title: frontmatter.title || documentId,
          headings: headings,
          tags: frontmatter.tags || [],
          excerpt: body.substring(0, 200).replace(/\n/g, ' ').trim() + '...',
          // Include document ID, title, headings, and tags in searchable text for better matching
          searchableText: `${documentId} ${frontmatter.title || ''} ${headings.join(' ')} ${body} ${(frontmatter.tags || []).join(' ')}`,
          body: body
        });
      }
    }
    
    let results = [];
    
    if (useFuzzy && allDocuments.length > 0) {
      // Configure Fuse.js for fuzzy search with improved weights
      const fuseOptions = {
        keys: [
          { name: 'documentId', weight: 0.35 },     // Highest weight for document ID/filename
          { name: 'title', weight: 0.30 },          // High weight for title
          { name: 'headings', weight: 0.15 },       // Moderate weight for headings
          { name: 'tags', weight: 0.10 },           // Lower weight for tags
          { name: 'searchableText', weight: 0.07 }, // Low weight for combined text
          { name: 'body', weight: 0.03 }            // Lowest weight for body text
        ],
        includeScore: true,
        threshold: threshold, // 0.0 = perfect match, 1.0 = match anything
        ignoreLocation: true, // Search anywhere in the text
        minMatchCharLength: 2,
        shouldSort: true,
        findAllMatches: true, // Find all matches for better scoring
        useExtendedSearch: false
      };
      
      const fuse = new Fuse(allDocuments, fuseOptions);
      const fuseResults = fuse.search(query);
      
      // Map Fuse results back to our format, including relevance score and matched fields
      results = fuseResults.map(result => ({
        workspace: result.item.workspace,
        documentId: result.item.documentId,
        fileName: result.item.fileName,
        title: result.item.title,
        headings: result.item.headings || [],
        tags: result.item.tags,
        excerpt: result.item.excerpt,
        relevanceScore: (1 - result.score).toFixed(3), // Convert Fuse score to relevance (0-1, higher is better)
        // Add information about where the match was strongest
        matchInfo: determineMatchType(result.item, query)
      }));
    } else {
      // Fallback to exact substring matching with priority scoring
      const queryLower = query.toLowerCase();
      
      for (const doc of allDocuments) {
        let score = 0;
        let matched = false;
        
        // Check for matches in different fields with different priorities
        if (doc.documentId.toLowerCase().includes(queryLower)) {
          score = 1.0; // Perfect score for document ID match
          matched = true;
        } else if (doc.title.toLowerCase().includes(queryLower)) {
          score = 0.9; // Very high score for title match
          matched = true;
        } else if (doc.headings.some(h => h.toLowerCase().includes(queryLower))) {
          score = 0.8; // High score for heading match
          matched = true;
        } else if (doc.tags.some(t => t.toLowerCase().includes(queryLower))) {
          score = 0.7; // Good score for tag match
          matched = true;
        } else if (doc.body.toLowerCase().includes(queryLower)) {
          score = 0.5; // Moderate score for body match
          matched = true;
        }
        
        if (matched) {
          results.push({
            workspace: doc.workspace,
            documentId: doc.documentId,
            fileName: doc.fileName,
            title: doc.title,
            headings: doc.headings || [],
            tags: doc.tags,
            excerpt: doc.excerpt,
            relevanceScore: score.toFixed(3),
            matchInfo: determineMatchType(doc, query)
          });
        }
      }
      
      // Sort by relevance score in exact matching mode
      results.sort((a, b) => parseFloat(b.relevanceScore) - parseFloat(a.relevanceScore));
    }
    
    return {
      query,
      searchMode: useFuzzy ? 'fuzzy' : 'exact',
      results,
      count: results.length
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Search failed: ${error.message}`);
  }
}

// Tool definitions
export const searchTools = [
  {
    name: 'search_documents',
    description: 'Search for documents by query. Searches in filenames, titles, headings, tags, and content with smart ranking',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        workspace: {
          type: 'string',
          description: 'Optional: specific workspace to search in'
        },
        fuzzy: {
          type: 'boolean',
          description: 'Enable fuzzy matching (default: true)',
          default: true
        },
        threshold: {
          type: 'number',
          description: 'Fuzzy matching threshold (0.0 = exact, 1.0 = match anything, default: 0.4)',
          default: 0.4,
          minimum: 0,
          maximum: 1
        }
      },
      required: ['query']
    }
  }
];

// Tool handlers
export const searchHandlers = {
  search_documents: async (args) => 
    searchDocuments(args.query, args.workspace, args.fuzzy !== false, args.threshold || 0.4)
};