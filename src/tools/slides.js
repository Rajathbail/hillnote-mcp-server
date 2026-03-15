/**
 * Slides tools for MCP server
 * Two-phase approach: story first, then visual design
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base path to the guide files in src/lib
const GUIDES_DIR = path.join(__dirname, '..', '..', '..', 'src', 'lib');

/**
 * Slides tool definitions for MCP
 */
export const slidesTools = [
  {
    name: 'get_slides_story_guide',
    description: 'IMPORTANT: Call this tool FIRST whenever the user asks to create a presentation, make slides, or create a slideshow. Returns the story-writing guide with 8 proven storytelling techniques (Hero\'s Journey, Sparklines, In Medias Res, etc.) to structure a compelling narrative. Do NOT use any visual layout markers (~split, ~inline, ~bg-, etc.) during this phase. Focus purely on the story. IMPORTANT: When creating slides with add_document, the title MUST end with ".slides.md".',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_slides_visual_guide',
    description: 'Call this AFTER the story has been written and the .slides.md file has been created. Requires the documentPath of the existing .slides.md file. Returns the visual design guide with layout markers, images, charts, mermaid diagrams, and real examples. Edit the file in batches of 3-5 slides adding visual elements throughout.',
    inputSchema: {
      type: 'object',
      properties: {
        documentPath: {
          type: 'string',
          description: 'Path to the existing .slides.md file (e.g., "documents/my-presentation.slides.md"). Required — proves the story has been drafted.'
        }
      },
      required: ['documentPath']
    }
  }
];

/**
 * Load a guide file, with an inline fallback
 */
async function loadGuide(filename, fallback) {
  try {
    const guidePath = path.join(GUIDES_DIR, filename);
    const content = await fs.readFile(guidePath, 'utf-8');
    return content;
  } catch (error) {
    return fallback;
  }
}

/**
 * Slides tool handlers
 */
export const slidesHandlers = {
  get_slides_story_guide: async () => {
    try {
      const guide = await loadGuide(
        'slidesStoryGuide.md',
        '# Hillnote Slides — Story Guide\n\nWrite your story first using standard markdown. Use .slides.md extension. Separate slides with ***. Use --- frontmatter with type: slides. Choose a storytelling technique: Hero\'s Journey, The Mountain, Nested Loops, Sparklines, In Medias Res, Converging Ideas, False Start, or Petal Structure. One idea per slide, 3-5 bullets max, headlines that tell the story. Do NOT use any ~ layout markers yet — those come in the visual pass.'
      );

      return {
        success: true,
        guide,
        usage_notes: {
          file_extension: '.slides.md',
          create_slides: 'Use add_document with title ending in ".slides.md" (e.g., "My Presentation.slides.md")',
          naming_convention: 'IMPORTANT: Use ".slides.md" extension in title. Example: "Growth Hacker Marketing.slides.md" creates "growth-hacker-marketing.slides.md"',
          important: 'Focus ONLY on story content. Do NOT use any ~ layout markers (like ~split, ~inline, ~bg-, ~column-). Those are for the visual design pass.',
          next_step: 'After writing the story, tell the user the draft is ready and ask if they want visual design applied. Then call get_slides_visual_guide with the documentPath.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load story guide: ${error.message}`
      };
    }
  },

  get_slides_visual_guide: async (args) => {
    const { documentPath } = args || {};
    if (!documentPath) {
      return {
        success: false,
        error: 'You must provide a documentPath to the .slides.md file. Write the story first using get_slides_story_guide, create the file with add_document, then call this tool with the document path.',
        hint: 'Call get_slides_story_guide first, create the .slides.md file, then call get_slides_visual_guide with documentPath set to the file path.'
      };
    }

    try {
      const guide = await loadGuide(
        'slidesVisualGuide.md',
        '# Hillnote Slides — Visual Design Guide\n\nYour story is written. Now edit the file in batches of 3-5 slides, adding visual elements. Key markers: ~inline (keep media in column), ~split (force new column), ~bg-COLOR (background), ~text-COLOR (text color), ~column1-2/3 (column width), ~banner (full-width row), ~bar/~line/~pie/~area (charts). Add Unsplash images, mermaid diagrams, and charts for visual impact.'
      );

      return {
        success: true,
        guide,
        documentPath,
        usage_notes: {
          workflow: 'Read the .slides.md file with read_document. Then edit in batches of 3-5 slides using replace_document_content — find the existing slide content and replace it with the visually enhanced version. Work through the deck in order.',
          important: 'Preserve all story content exactly as written. Only ADD layout markers (~split, ~inline, ~bg-, ~text-, ~column-, images, charts, etc.) around the existing text.',
          rules: [
            'The cover slide has its own styling when left empty — do not add backgrounds, colors, or layout markers to it unless the user specifically asks.',
            'Avoid custom colours unless ABSOLUTELY necessary — the default theme colors work well. Only use ~bg-, ~text-, ~bg-column-, or ~text-column- when genuinely needed.',
            'NEVER split text into two columns unless you have multiple distinct text sections — do not break a single paragraph or list across columns.',
            'Keep it simple and do not overdo it — not every slide needs images, charts, diagrams, and colored backgrounds. A clean slide with well-structured text is better than a cluttered one.',
            'When possible, always help the user visualise the slide\'s point rather than only using text — prefer images, diagrams, charts, or mermaid visualizations, but do this tastefully.'
          ],
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load visual guide: ${error.message}`
      };
    }
  }
};
