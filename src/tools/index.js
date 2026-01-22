/**
 * Central export for all MCP tools
 * This file aggregates all tool definitions and handlers
 */

import { workspaceTools, workspaceHandlers } from './workspace.js';
import { documentTools, documentHandlers } from './document.js';
import { contentTools, contentHandlers } from './content.js';
import { searchTools, searchHandlers } from './search.js';
import { recipeTools, recipeHandlers } from './recipe.js';
import { htmlToolTools, htmlToolHandlers } from './html-tool.js';
import { tasklistTools, tasklistHandlers } from './tasklist.js';
import { slidesTools, slidesHandlers } from './slides.js';
import { databaseTools, databaseHandlers } from './database.js';

// Export all tool definitions
export const tools = [
  ...workspaceTools,
  ...documentTools,
  ...contentTools,
  ...searchTools,
  ...recipeTools,
  ...htmlToolTools,
  ...tasklistTools,
  ...slidesTools,
  ...databaseTools
];

// Export all handlers
export const handlers = {
  ...workspaceHandlers,
  ...documentHandlers,
  ...contentHandlers,
  ...searchHandlers,
  ...recipeHandlers,
  ...htmlToolHandlers,
  ...tasklistHandlers,
  ...slidesHandlers,
  ...databaseHandlers
};

// Export individual tool categories for flexibility
export {
  workspaceTools,
  workspaceHandlers,
  documentTools,
  documentHandlers,
  contentTools,
  contentHandlers,
  searchTools,
  searchHandlers,
  recipeTools,
  recipeHandlers,
  htmlToolTools,
  htmlToolHandlers,
  tasklistTools,
  tasklistHandlers,
  slidesTools,
  slidesHandlers,
  databaseTools,
  databaseHandlers
};