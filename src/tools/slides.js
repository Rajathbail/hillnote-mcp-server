/**
 * Slides tools for MCP server
 * Provides guidance for creating and editing slide presentations in Hillnote
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Slides tool definitions for MCP
 */
export const slidesTools = [
  {
    name: 'get_slides_guide',
    description: 'Get the comprehensive guide for creating and editing slide presentations in Hillnote. This tool returns documentation on slide syntax, templates, chart types, and best practices. Use this before creating or editing .slides.md files. IMPORTANT: When creating slides with add_document, the title MUST end with ".slides.md" (e.g., "Growth Hacker Marketing.slides.md"). Do NOT use "-slides" in the title - the ".slides.md" extension is what makes it a slide presentation.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

/**
 * Load the slides guide content
 */
async function loadSlidesGuide() {
  // The guide is located in the HillnoteApp/src/lib directory
  // Navigate from mcp-server/src/tools to src/lib
  const guidePath = path.join(__dirname, '..', '..', '..', 'src', 'lib', 'slidesGuide.md');

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
  return `# Hillnote Slides Guide

## Quick Start

Slide files use the \`.slides.md\` extension and contain markdown with YAML frontmatter:

\`\`\`markdown
---
type: slides
theme: minimal
---

# Your First Slide

Content here...

---

# Second Slide

More content...
\`\`\`

## Key Points

1. **File Extension**: Use \`.slides.md\` for slide presentations
2. **Slide Separator**: Use \`---\` (three dashes) on its own line
3. **Document Tools**: Use \`create_document\`, \`read_document\`, and \`edit_document\` to work with slides

## Two Ways to Create Slides

### 1. Raw Markdown (Recommended)
Write natural markdown and layouts adapt automatically:
- Title slide: Just a heading
- Bullet slide: Heading + list
- Quote slide: Blockquote
- Image slide: Image + text

### 2. Templates
Use \`Slide: template_name\` for precise control:
- \`title_slide\`: Opening slide (title, subtitle)
- \`bullets\`: Bullet points (title, bullets)
- \`quote\`: Quotation (quote, author)
- \`chart\`: Data visualization (title, chart_type, data)
- \`table\`: Data table (title, data)
- \`image_left/right\`: Image with text

## Chart Types
For \`Slide: chart\`, use: bar, line, pie, or area

## Best Practices
1. One main idea per slide
2. 3-5 bullet points maximum
3. Use visuals when possible
4. Prefer raw markdown for simplicity

## Images
Use Unsplash for high-quality, free images. Format: \`https://images.unsplash.com/photo-ID?w=1280&h=720&fit=crop\`

Example: \`![Team](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1280&h=720&fit=crop)\`

Search https://unsplash.com to find images and copy the photo ID from the URL.`;
}

/**
 * Slides tool handlers
 */
export const slidesHandlers = {
  get_slides_guide: async () => {
    try {
      const guide = await loadSlidesGuide();

      return {
        success: true,
        guide,
        usage_notes: {
          file_extension: '.slides.md',
          create_slides: 'Use add_document with title ending in ".slides.md" (e.g., "My Presentation.slides.md")',
          naming_convention: 'IMPORTANT: Use ".slides.md" extension in title, NOT "-slides" in the name. Example: "Growth Hacker Marketing.slides.md" creates "growth-hacker-marketing.slides.md"',
          read_slides: 'Use read_document to read existing slide files',
          edit_slides: 'Use edit_document to modify slide content',
          example_title: 'My Presentation.slides.md',
          example_resulting_filename: 'my-presentation.slides.md'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load slides guide: ${error.message}`
      };
    }
  }
};
