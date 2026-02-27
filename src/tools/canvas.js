/**
 * Canvas tools for MCP server
 * Provides guidance for creating Excalidraw canvas drawings and reading canvas files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveWorkspace } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Canvas tool definitions for MCP
 */
export const canvasTools = [
  {
    name: 'get_canvas_guide',
    description: 'Get the comprehensive guide for creating and editing Excalidraw canvas drawings in Hillnote. Returns documentation on layout planning, element types, spacing, positioning, colors, and how to use add_canvas_elements. IMPORTANT: Call this FIRST before creating or editing canvas files. Read the "Layout Planning" section carefully — plan your sections and allocate vertical space BEFORE placing elements. When creating a canvas with add_document, the title MUST end with ".canvas.md" (e.g., "Architecture Diagram.canvas.md"). Do NOT provide content — the system generates it.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_canvas',
    description: 'Read and parse a canvas file (.canvas.md), returning a structured description of all elements with their types, positions, sizes, and properties.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        canvasPath: {
          type: 'string',
          description: 'Canvas file path relative to workspace (e.g., "documents/my-drawing.canvas.md")'
        }
      },
      required: ['workspace', 'canvasPath']
    }
  },
  {
    name: 'add_canvas_elements',
    description: 'Add shapes, text, arrows, and other elements to an Excalidraw canvas file. Writes directly to the .canvas.md file on disk. IMPORTANT: Plan sections first — allocate vertical space per section (120-200px each), leave 100-140px gaps between sections, max 3-4 items per row. Use POSITIVE coordinates starting from (0,0), build rightward/downward. Leave 60-80px gaps between elements. Keep text SHORT (max ~30 chars, 1-3 words for shape labels). Use clear_canvas first if redrawing. Call get_canvas_guide first to learn the element format.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        canvasPath: {
          type: 'string',
          description: 'Canvas file path relative to workspace (e.g., "documents/my-drawing.canvas.md")'
        },
        elements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['rectangle', 'ellipse', 'diamond', 'text', 'arrow', 'line'],
                description: 'Element type'
              },
              x: { type: 'number', description: 'X position (default: 0)' },
              y: { type: 'number', description: 'Y position (default: 0)' },
              width: { type: 'number', description: 'Width (default: 200, shapes only)' },
              height: { type: 'number', description: 'Height (default: 100, shapes only)' },
              strokeColor: { type: 'string', description: 'Stroke/border color hex (default: "#1e1e1e")' },
              backgroundColor: { type: 'string', description: 'Fill color hex or "transparent" (default: "transparent")' },
              fillStyle: { type: 'string', enum: ['solid', 'hachure', 'cross-hatch'], description: 'Fill style (default: "solid")' },
              strokeWidth: { type: 'number', description: 'Stroke width (default: 2)' },
              roughness: { type: 'number', description: '0=smooth, 1=artist, 2=cartoonist (default: 1)' },
              opacity: { type: 'number', description: 'Opacity 0-100 (default: 100)' },
              text: { type: 'string', description: 'Text content (required for text elements)' },
              fontSize: { type: 'number', description: 'Font size in px (default: 20)' },
              fontFamily: { type: 'number', description: '1=Virgil, 2=Helvetica, 3=Cascadia, 5=Excalifont (default: 5)' },
              textAlign: { type: 'string', enum: ['left', 'center', 'right'], description: 'Text alignment (default: "left")' },
              points: {
                type: 'array',
                items: { type: 'array', items: { type: 'number' } },
                description: 'Points for arrow/line, e.g. [[0,0],[200,100]]. Relative to element position.'
              },
              startArrowhead: { type: 'string', description: 'Start arrowhead: null, "arrow", "bar", "dot", "triangle"' },
              endArrowhead: { type: 'string', description: 'End arrowhead: "arrow" (default for arrows), null, "bar", "dot", "triangle"' },
              label: { type: 'string', description: 'Text label inside shape (rectangle/ellipse/diamond only)' },
              groupId: { type: 'string', description: 'Group ID to group multiple elements together' }
            },
            required: ['type']
          },
          description: 'Array of elements to add to the canvas'
        }
      },
      required: ['workspace', 'canvasPath', 'elements']
    }
  },
  {
    name: 'clear_canvas',
    description: 'Remove ALL elements from a canvas file, giving you a blank slate. Use this before add_canvas_elements when you want to redraw or redesign from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path or name'
        },
        canvasPath: {
          type: 'string',
          description: 'Canvas file path relative to workspace (e.g., "documents/my-drawing.canvas.md")'
        }
      },
      required: ['workspace', 'canvasPath']
    }
  }
];

/**
 * Load the canvas guide content from shared markdown file
 */
async function loadCanvasGuide() {
  // Navigate from mcp-server/src/tools to src/lib
  const guidePath = path.join(__dirname, '..', '..', '..', 'src', 'lib', 'canvasGuide.md');

  try {
    const content = await fs.readFile(guidePath, 'utf-8');
    return content;
  } catch (error) {
    // Fallback: return embedded guide if file not found
    return getEmbeddedGuide();
  }
}

/**
 * Embedded guide as fallback
 */
function getEmbeddedGuide() {
  return `# Excalidraw Canvas Guide

## IMPORTANT RULES
1. NEVER write raw Excalidraw JSON — always use add_canvas_elements
2. NEVER use replace_document_content/insert_document_content/delete_document_content on canvas files
3. Use clear_canvas first if you want to redraw from scratch, then add_canvas_elements
4. Use POSITIVE coordinates starting from (0,0) — build rightward and downward
5. Keep text SHORT — max ~30 chars for standalone text, 1-3 words for labels.
6. Let the canvas breathe — the viewport auto-zooms to fit, so spread elements out for readability. Don't compress horizontally.

## File Extension
Canvas files use the \`.canvas.md\` extension (e.g., \`my-drawing.canvas.md\`).

## Creating a Canvas
Use \`add_document\` with a name ending in \`.canvas.md\`:
- Example: \`name: "Architecture Diagram.canvas.md"\`
- Do NOT provide content — the system auto-generates it

## Layout Planning (Do This First!)
Before placing any elements, plan your layout by sections:
1. Identify your sections — Break content into 2-5 visual sections
2. Choose a layout pattern — Vertical stack, grid (2-3 per row), or mixed
3. Allocate vertical space per section — Each section needs 120-200px. Leave 100-140px gaps between sections.
4. Limit items per row — Max 3-4 shapes per row. Wrap to new row or use vertical list if more.

### Section Spacing Rules
- Between major sections vertically: 100-140px gap
- Section title to first element: 40-50px
- Between elements within a section: 60-80px
- Canvas edge margins: 20-30px on all sides

## Element Types
- \`rectangle\` — Box shape (x, y, width, height)
- \`ellipse\` — Oval/circle (x, y, width, height)
- \`diamond\` — Diamond shape (x, y, width, height)
- \`text\` — Text element (x, y, text, fontSize, fontFamily)
- \`arrow\` — Directional arrow (x, y, points: [[0,0],[dx,dy]])
- \`line\` — Straight/polyline (x, y, points: [[0,0],[dx,dy]])

## Coordinate System
- Start at (0,0) for your top-left element, build rightward (+X) and downward (+Y)
- Avoid negative coordinates
- The viewport auto-zooms to fit all elements — don't compress to a fixed width

## Common Properties
| Property | Default | Description |
|----------|---------|-------------|
| strokeColor | "#1e1e1e" | Border/line color (hex) |
| backgroundColor | "transparent" | Fill color |
| fillStyle | "solid" | "solid", "hachure", "cross-hatch" |
| strokeWidth | 2 | Line thickness |
| roughness | 1 | 0=smooth, 1=artist, 2=cartoonist |
| opacity | 100 | Opacity 0-100 |

## Text Properties
| Property | Default | Description |
|----------|---------|-------------|
| text | (required) | Text content |
| fontSize | 20 | Size in px (16=small, 20=normal, 28=large, 36=heading) |
| fontFamily | 5 | 1=Virgil, 2=Helvetica, 3=Cascadia, 5=Excalifont |
| textAlign | "left" | "left", "center", "right" |

## Arrow/Line Properties
| Property | Default | Description |
|----------|---------|-------------|
| points | [[0,0],[200,0]] | [x,y] pairs relative to position |
| endArrowhead | "arrow" | "arrow", null, "bar", "dot", "triangle" |

## Labels on Shapes
Use \`label\` on rectangle/ellipse/diamond for centered text inside.

## Colors
Stroke: #1e1e1e (black), #e03131 (red), #2f9e44 (green), #1971c2 (blue), #f08c00 (orange), #9c36b5 (purple)
Fill: #a5d8ff (light blue), #b2f2bb (light green), #ffec99 (light yellow), #ffc9c9 (light red), #eebefa (light purple), #ffd8a8 (light orange), #e9ecef (light gray)

## Best Practices
1. Plan sections first — identify major sections, allocate vertical space
2. Start at (0,0) — positive coordinates only
3. Space generously — 60-80px between elements, 100-140px between sections
4. Max 3-4 items per row
5. Keep text short — 1-3 words for labels, max ~30 chars for standalone text
6. Use labels on shapes — prefer label property over separate text elements
7. Connect shapes with arrows — place at shape edges, use points to span gaps`;
}

/**
 * Generate a random ID for Excalidraw elements
 */
function makeId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Approximate text dimensions without Canvas 2D API (server-side)
 * Uses character-width heuristics per font family
 */
function estimateTextDimensions(text, fontSize, fontFamily) {
  const LINE_HEIGHT = 1.25;
  // Approximate character width as fraction of fontSize
  const charWidthFactors = {
    1: 0.62,  // Virgil (hand-drawn, wider)
    2: 0.52,  // Helvetica
    3: 0.60,  // Cascadia (monospace)
    5: 0.62,  // Excalifont (hand-drawn, wider)
  };
  const factor = charWidthFactors[fontFamily] || charWidthFactors[5];

  const lines = text.split('\n');
  let maxWidth = 0;
  for (const line of lines) {
    const lineWidth = line.length * fontSize * factor;
    if (lineWidth > maxWidth) maxWidth = lineWidth;
  }

  const lineHeightPx = fontSize * LINE_HEIGHT;
  const height = lines.length * lineHeightPx;

  return {
    width: Math.ceil(maxWidth) + 4,
    height: Math.ceil(height),
  };
}

/**
 * Build full Excalidraw elements from simplified specs
 * Mirrors the logic in CanvasView.js addCanvasElements
 */
function buildExcalidrawElements(elementsSpec) {
  const LINE_HEIGHT = 1.25;
  const newElements = [];
  const elementIds = [];

  for (const spec of elementsSpec) {
    const id = makeId();
    elementIds.push(id);

    const base = {
      id,
      type: spec.type || 'rectangle',
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width: spec.width ?? 200,
      height: spec.height ?? 100,
      strokeColor: spec.strokeColor || '#1e1e1e',
      backgroundColor: spec.backgroundColor || 'transparent',
      fillStyle: spec.fillStyle || 'solid',
      strokeWidth: spec.strokeWidth ?? 2,
      strokeStyle: spec.strokeStyle || 'solid',
      roughness: spec.roughness ?? 1,
      opacity: spec.opacity ?? 100,
      angle: spec.angle ?? 0,
      seed: Math.floor(Math.random() * 2000000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      updated: Date.now(),
      isDeleted: false,
      groupIds: spec.groupId ? [spec.groupId] : [],
      boundElements: null,
      locked: false,
      frameId: null,
      index: null,
      roundness: spec.type === 'text' ? null : { type: 3 },
    };

    if (spec.type === 'text') {
      const textContent = spec.text || '';
      const fontSize = spec.fontSize || 20;
      const fontFamily = spec.fontFamily || 5;
      const measured = estimateTextDimensions(textContent, fontSize, fontFamily);

      Object.assign(base, {
        text: textContent,
        fontSize,
        fontFamily,
        textAlign: spec.textAlign || 'left',
        verticalAlign: 'top',
        width: spec.width || measured.width,
        height: spec.height || measured.height,
        lineHeight: LINE_HEIGHT,
        containerId: null,
        originalText: textContent,
        autoResize: true,
        roundness: null,
      });
    } else if (spec.type === 'arrow' || spec.type === 'line') {
      const points = spec.points || [[0, 0], [200, 0]];
      const xs = points.map(p => p[0]);
      const ys = points.map(p => p[1]);
      const pWidth = Math.max(...xs) - Math.min(...xs);
      const pHeight = Math.max(...ys) - Math.min(...ys);
      Object.assign(base, {
        points,
        startArrowhead: spec.type === 'arrow' ? (spec.startArrowhead || null) : null,
        endArrowhead: spec.type === 'arrow' ? (spec.endArrowhead ?? 'arrow') : null,
        startBinding: null,
        endBinding: null,
        lastCommittedPoint: null,
        width: pWidth,
        height: pHeight,
      });
    }

    newElements.push(base);

    // Handle label on shapes
    if (spec.label && ['rectangle', 'ellipse', 'diamond'].includes(spec.type)) {
      const textId = makeId();
      const labelFontSize = spec.fontSize || 20;
      const labelFontFamily = spec.fontFamily || 5;
      const labelText = spec.label;
      const measured = estimateTextDimensions(labelText, labelFontSize, labelFontFamily);

      const minWidth = measured.width + 40;
      const minHeight = measured.height + 20;
      if (base.width < minWidth) base.width = minWidth;
      if (base.height < minHeight) base.height = minHeight;

      base.boundElements = [{ id: textId, type: 'text' }];

      const textEl = {
        id: textId,
        type: 'text',
        x: base.x + 10,
        y: base.y + 10,
        width: base.width - 20,
        height: base.height - 20,
        text: labelText,
        fontSize: labelFontSize,
        fontFamily: labelFontFamily,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: LINE_HEIGHT,
        strokeColor: spec.strokeColor || '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 0,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: spec.opacity ?? 100,
        angle: 0,
        seed: Math.floor(Math.random() * 2000000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        updated: Date.now(),
        isDeleted: false,
        groupIds: spec.groupId ? [spec.groupId] : [],
        boundElements: null,
        locked: false,
        frameId: null,
        index: null,
        roundness: null,
        containerId: id,
        originalText: labelText,
        autoResize: true,
      };
      newElements.push(textEl);
    }
  }

  return { newElements, elementIds };
}

/**
 * Serialize elements + appState to .canvas.md format
 */
function serializeToCanvasMd(elements, appState = {}, files = {}) {
  const json = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    elements,
    appState,
    files,
  });

  return `---\ntype: canvas\n---\n\n\`\`\`excalidraw\n${json}\n\`\`\`\n`;
}

/**
 * Parse Excalidraw JSON from a .canvas.md file
 */
function parseCanvasContent(content) {
  const codeBlockRegex = /```excalidraw\s*\n([\s\S]*?)\n```/;
  const match = content.match(codeBlockRegex);

  if (!match || !match[1]) {
    return { elements: [], appState: {}, files: {} };
  }

  try {
    const data = JSON.parse(match[1].trim());
    return {
      elements: data.elements || [],
      appState: data.appState || {},
      files: data.files || {},
    };
  } catch (e) {
    return { elements: [], appState: {}, files: {} };
  }
}

/**
 * Canvas tool handlers
 */
export const canvasHandlers = {
  get_canvas_guide: async () => {
    try {
      const guide = await loadCanvasGuide();

      return {
        success: true,
        guide,
        usage_notes: {
          file_extension: '.canvas.md',
          create_canvas: 'Use add_document with name ending in .canvas.md (e.g., "Architecture Diagram.canvas.md"). Do NOT provide content.',
          read_canvas: 'Use read_canvas with workspace and canvasPath to parse a canvas file',
          layout_planning: 'IMPORTANT: Plan your layout by sections BEFORE placing elements. Identify 2-5 visual sections, allocate 120-200px per section, leave 100-140px gaps between sections. Max 3-4 items per row. Space elements 60-80px apart.',
          important: 'The name MUST end with .canvas.md. Do NOT provide content — the system generates the correct canvas format automatically.',
          note: 'add_canvas_elements and clear_canvas work via MCP by writing directly to the .canvas.md file. export_canvas_image is only available in the Hillnote app (requires live canvas).'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load canvas guide: ${error.message}`
      };
    }
  },

  read_canvas: async (args) => {
    try {
      if (!args.workspace) {
        return { error: 'workspace parameter is required' };
      }
      if (!args.canvasPath) {
        return { error: 'canvasPath parameter is required' };
      }

      const workspace = await resolveWorkspace(args.workspace);
      const filePath = path.join(workspace.path, args.canvasPath);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseCanvasContent(content);

      const elements = parsed.elements
        .filter((el) => !el.isDeleted)
        .map((el) => ({
          id: el.id,
          type: el.type,
          x: Math.round(el.x),
          y: Math.round(el.y),
          width: Math.round(el.width || 0),
          height: Math.round(el.height || 0),
          strokeColor: el.strokeColor,
          backgroundColor: el.backgroundColor,
          text: el.text || undefined,
          fontSize: el.fontSize || undefined,
          points: el.points || undefined,
          angle: el.angle || 0,
        }));

      return {
        canvasPath: args.canvasPath,
        elementCount: elements.length,
        elements,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { error: `Canvas file not found: ${args.canvasPath}` };
      }
      return { error: `Failed to read canvas: ${error.message}` };
    }
  },

  add_canvas_elements: async (args) => {
    try {
      if (!args.workspace) return { error: 'workspace parameter is required' };
      if (!args.canvasPath) return { error: 'canvasPath parameter is required' };
      if (!Array.isArray(args.elements) || args.elements.length === 0) {
        return { error: 'elements array is required and must not be empty' };
      }

      const workspace = await resolveWorkspace(args.workspace);
      const filePath = path.join(workspace.path, args.canvasPath);

      // Read existing canvas content
      let existingElements = [];
      let appState = {};
      let files = {};
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = parseCanvasContent(content);
        existingElements = parsed.elements.filter(el => !el.isDeleted);
        appState = parsed.appState;
        files = parsed.files;
      } catch (e) {
        // File doesn't exist yet — start fresh
      }

      // Build new Excalidraw elements from specs
      const { newElements, elementIds } = buildExcalidrawElements(args.elements);

      // Merge with existing
      const allElements = [...existingElements, ...newElements];

      // Write back to file
      const canvasMd = serializeToCanvasMd(allElements, appState, files);
      await fs.writeFile(filePath, canvasMd, 'utf-8');

      return {
        success: true,
        added: args.elements.length,
        totalElements: allElements.length,
        elementIds,
        canvasPath: args.canvasPath,
      };
    } catch (error) {
      return { error: `Failed to add canvas elements: ${error.message}` };
    }
  },

  clear_canvas: async (args) => {
    try {
      if (!args.workspace) return { error: 'workspace parameter is required' };
      if (!args.canvasPath) return { error: 'canvasPath parameter is required' };

      const workspace = await resolveWorkspace(args.workspace);
      const filePath = path.join(workspace.path, args.canvasPath);

      // Read existing to preserve appState
      let appState = {};
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = parseCanvasContent(content);
        appState = parsed.appState;
      } catch (e) {
        // File doesn't exist — that's fine
      }

      // Write back with empty elements
      const canvasMd = serializeToCanvasMd([], appState, {});
      await fs.writeFile(filePath, canvasMd, 'utf-8');

      return {
        success: true,
        message: 'All elements cleared from canvas',
        canvasPath: args.canvasPath,
      };
    } catch (error) {
      return { error: `Failed to clear canvas: ${error.message}` };
    }
  }
};
