import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getDocumentPath, resolveWorkspace } from '../utils/helpers.js';

/**
 * Insert content at specific position in document with optional position validation
 */
export async function insertContent(workspaceIdOrPath, documentId, position, text, expectedLineBefore = null) {
  try {
    // Input validation
    if (!workspaceIdOrPath) {
      throw new McpError(ErrorCode.InvalidParams, 'Workspace ID or path is required');
    }
    if (!documentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
    }
    if (text === null || text === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Text to insert is required');
    }
    
    // Validate and normalize position parameter
    const validPositions = ['start', 'end'];
    if (position !== null && position !== undefined) {
      if (typeof position === 'string' && !validPositions.includes(position.toLowerCase())) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid position "${position}". Use "start", "end", or a number.`);
      }
      if (typeof position === 'number' && (position < 0 || !Number.isFinite(position))) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid position number ${position}. Must be a non-negative finite number.`);
      }
    }
    
    // Normalize position to lowercase if string
    if (typeof position === 'string') {
      position = position.toLowerCase();
    }
    
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const docPath = await getDocumentPath(workspace.path, documentId);
    
    // Check file size before reading (limit to 10MB to prevent memory issues)
    const stats = await fs.stat(docPath);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_FILE_SIZE) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum supported size is 10MB.`
      );
    }
    
    const content = await fs.readFile(docPath, 'utf-8');
    const lines = content.split('\n');
    
    // Determine actual insertion position
    let actualPosition;
    let insertionLine = -1;
    
    if (position === 'start') {
      actualPosition = 0;
      insertionLine = 0;
    } else if (position === 'end' || position === null || position === undefined) {
      // Default to 'end' if position is null/undefined
      actualPosition = content.length;
      insertionLine = lines.length;
    } else if (typeof position === 'number') {
      // Clamp position to valid range
      actualPosition = Math.min(Math.max(0, position), content.length);
      
      // Calculate which line the position falls on
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= actualPosition) {
          insertionLine = i;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }
      if (insertionLine === -1) insertionLine = lines.length;
    }
    
    // Validate expected line before insertion if provided
    if (expectedLineBefore !== null && expectedLineBefore !== undefined) {
      // Get the line that would be before the insertion point
      let lineBeforeInsertion = '';
      if (insertionLine > 0 && insertionLine <= lines.length) {
        lineBeforeInsertion = lines[insertionLine - 1];
      } else if (insertionLine === 0) {
        lineBeforeInsertion = '(beginning of document)';
      } else {
        lineBeforeInsertion = insertionLine >= lines.length ? lines[lines.length - 1] : '';
      }
      
      // Check if it matches the expected line
      if (lineBeforeInsertion !== expectedLineBefore) {
        // Find all occurrences of the expected line
        const occurrences = [];
        lines.forEach((line, index) => {
          if (line === expectedLineBefore) {
            occurrences.push({
              lineNumber: index + 1,
              afterPosition: lines.slice(0, index + 1).join('\n').length,
              contextBefore: lines[Math.max(0, index - 1)] || '(beginning)',
              contextAfter: lines[index + 1] || '(end)'
            });
          }
        });
        
        return {
          success: false,
          error: 'Position validation failed',
          message: 'The line before the insertion point does not match the expected content',
          expected: expectedLineBefore,
          actual: lineBeforeInsertion,
          currentPosition: {
            line: insertionLine + 1,
            character: actualPosition
          },
          suggestedPositions: occurrences.length > 0 ? occurrences : null,
          hint: occurrences.length > 0 
            ? `Found ${occurrences.length} occurrence(s) of the expected line. Please verify the insertion position.`
            : 'The expected line was not found in the document. Please check the content.'
        };
      }
    }
    
    // Insert text at position
    let newContent;
    if (position === 'start') {
      newContent = text + '\n\n' + content;
    } else if (position === 'end' || position === null || position === undefined) {
      newContent = content + '\n\n' + text;
    } else if (typeof position === 'number') {
      newContent = content.slice(0, actualPosition) + text + content.slice(actualPosition);
    }
    
    // Generate preview with context
    const newLines = newContent.split('\n');
    const insertedLines = text.split('\n');
    
    // Calculate where inserted content ends in the new document
    let insertedEndLine = insertionLine + insertedLines.length;
    
    // Get exactly 3 lines before and after the inserted content
    const contextLinesBefore = 3;
    const contextLinesAfter = 3;
    
    // Build focused preview
    const focusedPreview = [];
    
    // Add lines before insertion (from new content)
    const beforeStart = Math.max(0, insertionLine - contextLinesBefore);
    for (let i = beforeStart; i < insertionLine && i < newLines.length; i++) {
      focusedPreview.push({
        lineNumber: i + 1,
        content: newLines[i],
        type: 'context-before'
      });
    }
    
    // Add inserted lines
    for (let i = insertionLine; i < insertedEndLine && i < newLines.length; i++) {
      focusedPreview.push({
        lineNumber: i + 1,
        content: newLines[i],
        type: 'inserted',
        isFirstInserted: i === insertionLine,
        isLastInserted: i === insertedEndLine - 1
      });
    }
    
    // Add lines after insertion
    const afterEnd = Math.min(newLines.length, insertedEndLine + contextLinesAfter);
    for (let i = insertedEndLine; i < afterEnd; i++) {
      focusedPreview.push({
        lineNumber: i + 1,
        content: newLines[i],
        type: 'context-after'
      });
    }
    
    // Format the preview for display
    const formattedPreview = focusedPreview.map(line => {
      let marker = '    ';
      if (line.type === 'inserted') {
        marker = '>>> ';
        if (line.isFirstInserted) marker = '>>> [START]';
        if (line.isLastInserted) marker = '>>> [END]  ';
      }
      return `${marker} ${line.lineNumber.toString().padStart(4)}: ${line.content}`;
    }).join('\n');
    
    // Create simple context preview (for backward compatibility)
    const contextBefore = lines.slice(Math.max(0, insertionLine - 3), insertionLine).join('\n');
    const contextAfter = newLines.slice(insertedEndLine, Math.min(newLines.length, insertedEndLine + 3)).join('\n');
    
    // Write atomically using a temporary file to prevent corruption
    const tempPath = docPath + '.tmp.' + Date.now();
    try {
      await fs.writeFile(tempPath, newContent, 'utf-8');
      await fs.rename(tempPath, docPath);
    } catch (writeError) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw new McpError(ErrorCode.InternalError, `Failed to write file: ${writeError.message}`);
    }
    
    return {
      success: true,
      documentId,
      message: 'Content inserted successfully',
      insertion: {
        position: typeof position === 'number' ? actualPosition : position,
        lineNumber: insertionLine + 1,
        textLength: text.length,
        linesInserted: insertedLines.length
      },
      preview: {
        // New focused preview showing exactly what was requested
        focused: formattedPreview,
        // Simple context for quick understanding
        context: {
          before: contextBefore || '(beginning of document)',
          inserted: text.length > 200 ? text.substring(0, 200) + '...' : text,
          after: contextAfter || '(end of document)'
        },
        // Summary of what's shown
        summary: `Showing ${focusedPreview.length} lines: ${contextLinesBefore} before, ${insertedLines.length} inserted, ${Math.min(contextLinesAfter, newLines.length - insertedEndLine)} after`
      },
      validation: {
        expectedLineBefore: expectedLineBefore || 'not provided',
        actualLineBefore: insertionLine > 0 ? lines[insertionLine - 1] : '(beginning of document)',
        positionValidated: expectedLineBefore !== null
      },
      documentStats: {
        originalLength: content.length,
        newLength: newContent.length,
        originalLines: lines.length,
        newLines: newLines.length
      }
    };
  } catch (error) {
    // If it's already an McpError, pass it through
    if (error instanceof McpError) {
      throw error;
    }
    // Otherwise wrap it
    throw new McpError(ErrorCode.InternalError, `Failed to insert content: ${error.message}`);
  }
}

/**
 * Delete content from document between positions with safety check
 */
export async function deleteContent(workspaceIdOrPath, documentId, startPos, endPos, expectedContent = null) {
  try {
    // Input validation
    if (!workspaceIdOrPath) {
      throw new McpError(ErrorCode.InvalidParams, 'Workspace ID or path is required');
    }
    if (!documentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
    }
    
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const docPath = await getDocumentPath(workspace.path, documentId);
    
    // Check file size before reading
    const stats = await fs.stat(docPath);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_FILE_SIZE) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum supported size is 10MB.`
      );
    }
    
    const content = await fs.readFile(docPath, 'utf-8');
    
    // Validate positions
    if (startPos < 0 || endPos > content.length || startPos >= endPos) {
      throw new Error(`Invalid positions: startPos=${startPos}, endPos=${endPos}, content length=${content.length}`);
    }
    
    // Extract the content that will be deleted
    const contentToDelete = content.slice(startPos, endPos);
    
    // If expectedContent is provided, verify it matches
    if (expectedContent !== null && expectedContent !== undefined) {
      // Normalize both strings for comparison (trim whitespace)
      const normalizedExpected = expectedContent.trim();
      const normalizedActual = contentToDelete.trim();
      
      if (normalizedExpected !== normalizedActual) {
        // Find all occurrences of the expected content in the document
        const occurrences = [];
        let searchPos = 0;
        
        while (searchPos < content.length) {
          const index = content.indexOf(expectedContent, searchPos);
          if (index === -1) break;
          
          occurrences.push({
            startPos: index,
            endPos: index + expectedContent.length,
            context: content.substring(Math.max(0, index - 20), Math.min(content.length, index + expectedContent.length + 20))
          });
          
          searchPos = index + 1;
        }
        
        return {
          success: false,
          error: 'Content mismatch',
          message: 'The content at the specified positions does not match the expected content',
          actualAtPosition: {
            content: contentToDelete.substring(0, 200) + (contentToDelete.length > 200 ? '...' : ''),
            startPos,
            endPos
          },
          suggestedPositions: occurrences.length > 0 ? occurrences : null,
          hint: occurrences.length > 0 
            ? `Found ${occurrences.length} occurrence(s) of the expected content at different positions. Please verify and use the correct positions.`
            : 'The expected content was not found anywhere in the document. Please check the content and try again.'
        };
      }
    }
    
    // Delete content between positions
    const newContent = content.slice(0, startPos) + content.slice(endPos);
    
    // Write atomically using a temporary file
    const tempPath = docPath + '.tmp.' + Date.now();
    try {
      await fs.writeFile(tempPath, newContent, 'utf-8');
      await fs.rename(tempPath, docPath);
    } catch (writeError) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw new McpError(ErrorCode.InternalError, `Failed to write file: ${writeError.message}`);
    }
    
    return {
      success: true,
      documentId,
      message: 'Content deleted successfully',
      deletedLength: endPos - startPos,
      deletedPreview: contentToDelete.substring(0, 100) + (contentToDelete.length > 100 ? '...' : '')
    };
  } catch (error) {
    // If it's already an McpError, pass it through
    if (error instanceof McpError) {
      throw error;
    }
    // Otherwise wrap it
    throw new McpError(ErrorCode.InternalError, `Failed to delete content: ${error.message}`);
  }
}

/**
 * Replace content in document with advanced error handling and suggestions
 */
export async function replaceContent(workspaceIdOrPath, documentId, searchText, replaceText, all = false) {
  try {
    // Input validation
    if (!workspaceIdOrPath) {
      throw new McpError(ErrorCode.InvalidParams, 'Workspace ID or path is required');
    }
    if (!documentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
    }
    if (searchText === null || searchText === undefined || searchText === '') {
      throw new McpError(ErrorCode.InvalidParams, 'Search text is required and cannot be empty');
    }
    if (replaceText === null || replaceText === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Replace text is required');
    }
    
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const docPath = await getDocumentPath(workspace.path, documentId);
    
    // Check file size before reading
    const stats = await fs.stat(docPath);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_FILE_SIZE) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum supported size is 10MB.`
      );
    }
    
    const content = await fs.readFile(docPath, 'utf-8');
    
    // Check if the search text exists in the document
    if (!content.includes(searchText)) {
      // Find similar or partial matches to help with debugging
      const suggestions = [];
      
      // 1. Try to find partial matches (first 50 chars of search text)
      const partialSearch = searchText.substring(0, Math.min(50, searchText.length));
      let searchPos = 0;
      while (searchPos < content.length) {
        const index = content.indexOf(partialSearch, searchPos);
        if (index === -1) break;
        
        suggestions.push({
          type: 'partial',
          startPos: index,
          endPos: Math.min(index + searchText.length, content.length),
          content: content.substring(index, Math.min(index + 200, content.length)),
          matchLength: partialSearch.length
        });
        
        searchPos = index + 1;
        if (suggestions.length >= 3) break; // Limit to 3 suggestions
      }
      
      // 2. Try fuzzy matching by looking for key phrases
      if (suggestions.length === 0) {
        // Extract key phrases (e.g., headings, unique words)
        const keyPhrases = searchText.match(/##\s+[^\n]+|Fact \d+:|[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
        
        for (const phrase of keyPhrases.slice(0, 3)) {
          const phraseIndex = content.indexOf(phrase);
          if (phraseIndex !== -1) {
            suggestions.push({
              type: 'keyPhrase',
              phrase,
              startPos: phraseIndex,
              endPos: Math.min(phraseIndex + 200, content.length),
              content: content.substring(phraseIndex, Math.min(phraseIndex + 200, content.length))
            });
          }
        }
      }
      
      // 3. Find line-based context if search text has line breaks
      if (searchText.includes('\n')) {
        const searchLines = searchText.split('\n').filter(line => line.trim());
        const firstLine = searchLines[0];
        const lineIndex = content.indexOf(firstLine);
        
        if (lineIndex !== -1) {
          suggestions.push({
            type: 'firstLine',
            startPos: lineIndex,
            endPos: Math.min(lineIndex + searchText.length, content.length),
            content: content.substring(lineIndex, Math.min(lineIndex + 300, content.length)),
            note: 'Found the first line of your search text'
          });
        }
      }
      
      return {
        success: false,
        error: 'Content not found',
        message: 'The exact search text was not found in the document',
        searchTextPreview: searchText.substring(0, 200) + (searchText.length > 200 ? '...' : ''),
        suggestions: suggestions.length > 0 ? suggestions : null,
        hint: suggestions.length > 0 
          ? `Found ${suggestions.length} potential match(es). The content might have been modified. Try using one of the suggested positions or search for a smaller, exact portion of text.`
          : 'No similar content found. Please verify the exact text exists in the document.',
        documentInfo: {
          totalLength: content.length,
          lineCount: content.split('\n').length
        }
      };
    }
    
    // Find all occurrences with their positions for verification
    const occurrences = [];
    let searchPos = 0;
    
    while (searchPos < content.length) {
      const index = content.indexOf(searchText, searchPos);
      if (index === -1) break;
      
      occurrences.push({
        startPos: index,
        endPos: index + searchText.length,
        preview: content.substring(Math.max(0, index - 30), Math.min(content.length, index + searchText.length + 30))
      });
      
      searchPos = index + 1;
    }
    
    // Replace content
    let newContent;
    let replacedCount;
    
    if (all) {
      newContent = content.replaceAll(searchText, replaceText);
      replacedCount = occurrences.length;
    } else {
      newContent = content.replace(searchText, replaceText);
      replacedCount = 1;
    }
    
    // Verify that replacement actually happened
    if (newContent === content) {
      return {
        success: false,
        error: 'No changes made',
        message: 'The replacement did not result in any changes to the document',
        hint: 'This might occur if the search and replace text are identical',
        searchText: searchText.substring(0, 200),
        replaceText: replaceText.substring(0, 200)
      };
    }
    
    // Calculate what changed for verification
    const changedPositions = occurrences.slice(0, all ? occurrences.length : 1).map(occ => ({
      originalStart: occ.startPos,
      originalEnd: occ.endPos,
      newLength: replaceText.length
    }));
    
    // Write atomically using a temporary file
    const tempPath = docPath + '.tmp.' + Date.now();
    try {
      await fs.writeFile(tempPath, newContent, 'utf-8');
      await fs.rename(tempPath, docPath);
    } catch (writeError) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw new McpError(ErrorCode.InternalError, `Failed to write file: ${writeError.message}`);
    }
    
    return {
      success: true,
      documentId,
      message: `Content replaced successfully`,
      details: {
        occurrencesFound: occurrences.length,
        occurrencesReplaced: replacedCount,
        mode: all ? 'all occurrences' : 'first occurrence only',
        positions: changedPositions,
        originalLength: searchText.length,
        newLength: replaceText.length,
        documentLengthChange: newContent.length - content.length
      }
    };
  } catch (error) {
    // If it's already an McpError, pass it through
    if (error instanceof McpError) {
      throw error;
    }
    // Otherwise wrap it
    throw new McpError(ErrorCode.InternalError, `Failed to replace content: ${error.message}`);
  }
}

// Tool definitions
export const contentTools = [
  {
    name: 'insert_content',
    description: 'Insert content at a specific position with validation and preview',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string'
        },
        documentId: {
          type: 'string'
        },
        position: {
          type: ['string', 'number'],
          description: '"start", "end", or character position'
        },
        text: {
          type: 'string',
          description: 'Text to insert'
        },
        expectedLineBefore: {
          type: 'string',
          description: 'Optional: The exact line expected before the insertion point for position validation'
        }
      },
      required: ['workspace', 'documentId', 'position', 'text']
    }
  },
  {
    name: 'delete_content',
    description: 'Delete content between positions (requires content verification for safety)',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string'
        },
        documentId: {
          type: 'string'
        },
        startPos: {
          type: 'number',
          description: 'Start position of content to delete'
        },
        endPos: {
          type: 'number',
          description: 'End position of content to delete'
        },
        expectedContent: {
          type: 'string',
          description: 'The exact content expected at these positions (required for safety verification)'
        }
      },
      required: ['workspace', 'documentId', 'startPos', 'endPos', 'expectedContent']
    }
  },
  {
    name: 'replace_content',
    description: 'Replace text in document',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string'
        },
        documentId: {
          type: 'string'
        },
        searchText: {
          type: 'string'
        },
        replaceText: {
          type: 'string'
        },
        all: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)'
        }
      },
      required: ['workspace', 'documentId', 'searchText', 'replaceText']
    }
  }
];

// Tool handlers
export const contentHandlers = {
  insert_content: async (args) => 
    insertContent(args.workspace, args.documentId, args.position, args.text, args.expectedLineBefore),
  
  delete_content: async (args) => 
    deleteContent(args.workspace, args.documentId, args.startPos, args.endPos, args.expectedContent),
  
  replace_content: async (args) => 
    replaceContent(args.workspace, args.documentId, args.searchText, args.replaceText, args.all)
};