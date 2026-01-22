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
    description: 'Get the comprehensive guide for creating slide presentations in Hillnote. Returns documentation on slide syntax, layout rules, charts, videos, and best practices. Use this before creating or editing .slides.md files. IMPORTANT: When creating slides with add_document, the title MUST end with ".slides.md" (e.g., "Growth Hacker Marketing.slides.md"). Raw markdown is recommended over templates.',
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

A guide for creating slide presentations in Hillnote.

## File Extension

Slide files use the \`.slides.md\` extension (e.g., \`my-presentation.slides.md\`). They are regular markdown documents that can be created, read, and edited using the standard document tools (\`add_document\`, \`read_document\`, \`edit_document\`).

## File Structure

Slide files use markdown with a YAML frontmatter header:

\`\`\`markdown
***
type: slides
theme: minimal
***

# Your First Slide

Content here...

***

# Second Slide

More content...
\`\`\`

## Slide Separators

Use \`***\` (three asterisks) on its own line to separate slides.

## The Column Rule

Slides use a simple column-based layout system:
- **Text blocks stack vertically** in one column (headings, paragraphs, lists, quotes, code, tables)
- **Each image/video gets its own column**

Examples:
\`\`\`
text only              = 1 column
text + image           = 2 columns
text + image + image   = 3 columns
text + image + text    = 3 columns
image + image + image  = 3 columns
\`\`\`

## Cover Slides

The **first slide** of a presentation automatically becomes a cover slide if it contains **only text** (no images or videos). Cover slides feature:
- A beautiful gradient background (randomly selected from 8 options)
- Doubled H1 font size for impact
- Light font weight for elegance
- White text on the gradient

## Vertical Layout with Dividers

Use a single \`~\` on its own line to create vertical sections that spread apart using \`justify-between\`:

\`\`\`markdown
# Title at Top

~

Footer content at bottom
\`\`\`

You can use multiple dividers to create multiple vertical sections:

\`\`\`markdown
# Top Section

~

Middle Section

~

Bottom Section
\`\`\`

## Two Ways to Create Slides

### 1. Raw Markdown (Recommended)

Write natural markdown and the layout adapts automatically based on content:

\`\`\`markdown
***
type: slides
theme: minimal
***

# Welcome to My Presentation

A subtitle or tagline here

***

## Key Points

- First important point
- Second important point
- Third important point

***

## Image with Text

![Description](image-url.jpg)

Some explanatory text next to the image.

***

> "A meaningful quote goes here"
> — Author Name

***

## Data Overview

| Type | Purpose | Cost |
|------|---------|------|
| Attack | Deal damage | 1-5 |
| Defense | Block damage | 0-2 |
| Utility | Draw cards | 1-2 |
\`\`\`

**Auto-detected layouts:**
- **Cover**: First slide with text only → gradient background, large title
- **Title**: Heading only → centered title slide
- **Content**: Heading + paragraphs → left-aligned content
- **Bullets**: Heading + list → bullet point slide
- **Image Left/Right**: Image + text → split layout (image position based on order)
- **Quote**: Blockquote → centered quote slide
- **Code**: Code block → syntax-highlighted code slide
- **Table**: Markdown table → formatted table slide

### 2. Templates (Legacy)

Templates exist but are rarely needed. Raw markdown handles almost everything better:

| Instead of... | Just write... |
|---------------|---------------|
| \`Slide: title_slide\` | \`# Title\` with subtitle text |
| \`Slide: bullets\` | \`## Heading\` with \`- bullet\` list |
| \`Slide: quote\` | \`> "Quote text" — Author\` |
| \`Slide: image_left\` | \`![img](url)\` then text |
| \`Slide: image_right\` | Text then \`![img](url)\` |
| \`Slide: chart\` | \`~bar\` / \`~line\` / \`~pie\` / \`~area\` before a table |

## Layout Control Markers

### ~inline - Keep Media in Same Column

Use \`~inline\` on its own line to keep the next media block in the same column as the preceding text (instead of creating a new column):

\`\`\`markdown
## Product Overview

Description of the product.

~inline

![Product](product.png)
\`\`\`

Without \`~inline\`: text + image = 2 columns
With \`~inline\`: text + image = 1 column (image below text)

### ~split - Force Text into New Column

Use \`~split\` on its own line to force the next text content into a new column (instead of stacking):

\`\`\`markdown
| Feature | Status |
|---------|--------|
| Alpha   | Done   |

~split

## Next Phase

| Feature | Status |
|---------|--------|
| Beta    | WIP    |
\`\`\`

Without \`~split\`: both tables stack in 1 column
With \`~split\`: tables are in 2 separate columns

## Charts (Optional - For Numeric Data Visualization)

**Regular tables render as tables by default - no markers needed.**

Only use \`~bar\`, \`~line\`, \`~pie\`, or \`~area\` when you want to convert a numeric data table into a visual chart:

\`\`\`markdown
~bar

| Quarter | Revenue |
|---------|---------|
| Q1      | 100     |
| Q2      | 150     |
| Q3      | 200     |
| Q4      | 280     |
\`\`\`

**When to use charts vs tables:**
- **Use a plain table** (no marker) for text-based data, comparisons, feature lists, or any non-numeric information
- **Use a chart marker** only when you have numeric data that benefits from visual representation (trends, comparisons over time, proportions)

Available chart types:
- \`~bar\` - Vertical bar chart (good for comparing categories)
- \`~line\` - Line chart (good for trends over time)
- \`~pie\` - Pie chart (good for showing proportions of a whole)
- \`~area\` - Area chart (good for cumulative trends)

Charts are treated as text blocks, meaning they stack vertically with other text content.

## Mermaid Diagrams - To help make the deck visual

Mermaid diagrams are fully supported in slides for creating flowcharts, sequence diagrams, Gantt charts, and more. Simply use a standard mermaid code fence:

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

Supported diagram types:
- **Flowcharts** - \`graph TD\` or \`graph LR\` for process flows
- **Sequence diagrams** - \`sequenceDiagram\` for interactions between components
- **Gantt charts** - \`gantt\` for project timelines and schedules
- **Class diagrams** - \`classDiagram\` for object-oriented structures
- **State diagrams** - \`stateDiagram-v2\` for state machines
- **Entity Relationship** - \`erDiagram\` for database schemas
- **Pie charts** - \`pie\` for simple proportional data
- **Mind maps** - \`mindmap\` for hierarchical ideas

Example Gantt chart:
\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements :a1, 2024-01-01, 7d
    Design       :a2, after a1, 5d
    section Development
    Backend      :b1, after a2, 14d
    Frontend     :b2, after a2, 14d
\`\`\`

Mermaid diagrams are treated as text blocks and will stack vertically with other content. They automatically adapt to light/dark mode.

## Inline Formatting

Markdown formatting works within slides:
- \`**bold text**\` → **bold text**
- \`*italic text*\` → *italic text*
- \`==highlight==\` → highlighted text (yellow background)
- \\\`code\\\` → inline code
- \`[link](url)\` → clickable link

## Best Practices

1. **Keep slides focused** - One main idea per slide
2. **Use visuals** - Images and charts communicate faster than text
3. **Limit bullets** - 3-5 points maximum per slide
4. **Use raw markdown** - Layouts adapt automatically, no templates needed
5. **Use layout markers** - \`~\` for vertical spacing, \`~inline\` and \`~split\` for column control

## Images

Use Unsplash for high-quality, free images. Format: \`https://images.unsplash.com/photo-ID?w=1280&h=720&fit=crop\`

Example:
\`\`\`markdown
![Team collaboration](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1280&h=720&fit=crop)
\`\`\`

Search Unsplash at https://unsplash.com to find relevant images, then copy the photo ID from the URL.

## Videos

Embed YouTube or Vimeo videos using two syntax options:

### Option 1: Image syntax with video URL
\`\`\`markdown
![Video Title](https://www.youtube.com/watch?v=VIDEO_ID)
![Video Title](https://youtu.be/VIDEO_ID)
![Video Title](https://vimeo.com/VIDEO_ID)
\`\`\`

### Option 2: YouTube shorthand
\`\`\`markdown
[youtube:Video Title](VIDEO_ID)
\`\`\`

Videos are treated like images in the column system - each video gets its own column by default. Use \`~inline\` to keep a video in the same column as text.`;
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
          example_resulting_filename: 'my-presentation.slides.md',
          recommended_approach: 'Use raw markdown instead of templates. Templates are legacy and rarely needed.',
          slide_separator: 'Use *** (three asterisks) on its own line to separate slides',
          layout_markers: {
            divider: '~ creates vertical sections with justify-between',
            inline: '~inline keeps the next media in the same column as text',
            split: '~split forces the next text into a new column',
            charts: '~bar, ~line, ~pie, ~area before a table renders it as a chart'
          },
          videos: 'Use ![Title](youtube-url) or [youtube:Title](VIDEO_ID) for YouTube embeds'
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
