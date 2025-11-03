/**
 * Recipe management tools for MCP server
 * Handles AI prompt overrides and recipe management within workspaces
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Recipe tool definitions for MCP
 */
export const recipeTools = [
  {
    name: 'list_recipes',
    description: 'List all AI prompt recipes in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_recipe',
    description: 'Get a specific recipe by ID',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        recipeId: {
          type: 'string',
          description: 'The ID of the recipe to retrieve'
        }
      },
      required: ['workspacePath', 'recipeId']
    }
  },
  {
    name: 'create_recipe',
    description: 'Create a new AI prompt recipe',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        recipe: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the recipe (auto-generated if not provided)'
            },
            when_user_asks_about: {
              type: 'string',
              description: 'Description of what triggers this recipe'
            },
            override_instructions: {
              type: 'string',
              description: 'Specific instructions for the AI to follow'
            },
            required_documents: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of document paths that must be included'
            },
            optional_documents: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of document paths that may be included'
            },
            output_format: {
              type: 'string',
              description: 'Expected format for the AI response'
            }
          },
          required: ['when_user_asks_about', 'override_instructions']
        }
      },
      required: ['workspacePath', 'recipe']
    }
  },
  {
    name: 'update_recipe',
    description: 'Update an existing AI prompt recipe',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        recipeId: {
          type: 'string',
          description: 'The ID of the recipe to update'
        },
        updates: {
          type: 'object',
          properties: {
            when_user_asks_about: {
              type: 'string',
              description: 'Updated trigger description'
            },
            override_instructions: {
              type: 'string',
              description: 'Updated instructions for the AI'
            },
            required_documents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated list of required documents'
            },
            optional_documents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated list of optional documents'
            },
            output_format: {
              type: 'string',
              description: 'Updated output format'
            }
          }
        }
      },
      required: ['workspacePath', 'recipeId', 'updates']
    }
  },
  {
    name: 'get_recipe_documents',
    description: 'Get the content of documents referenced by a recipe',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Absolute path to the workspace directory'
        },
        recipeId: {
          type: 'string',
          description: 'The ID of the recipe'
        },
        includeOptional: {
          type: 'boolean',
          description: 'Whether to include optional documents (default: true)'
        }
      },
      required: ['workspacePath', 'recipeId']
    }
  }
];

/**
 * Load recipes from workspace
 */
async function loadRecipes(workspacePath) {
  const recipesPath = path.join(workspacePath, 'ai_prompt_overrides.json');
  
  try {
    const content = await fs.readFile(recipesPath, 'utf-8');
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create default structure
      const defaultData = {
        "_instructions_for_ai": "This file contains custom instructions that override default behavior for specific user requests. When a user's request matches any 'when_user_asks_about' description, follow the corresponding instructions and reference the specified documents.",
        "overrides": [],
        "matching_notes": "Use flexible matching - if the user's request contains key concepts from 'when_user_asks_about', apply the override. Multiple matches should use the most specific override."
      };
      
      await fs.writeFile(recipesPath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    throw error;
  }
}

/**
 * Save recipes to workspace
 */
async function saveRecipes(workspacePath, data) {
  const recipesPath = path.join(workspacePath, 'ai_prompt_overrides.json');
  await fs.writeFile(recipesPath, JSON.stringify(data, null, 2));
}


/**
 * Recipe tool handlers
 */
export const recipeHandlers = {
  list_recipes: async ({ workspacePath }) => {
    try {
      const data = await loadRecipes(workspacePath);
      return {
        success: true,
        recipes: data.overrides || [],
        total: (data.overrides || []).length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list recipes: ${error.message}`
      };
    }
  },

  get_recipe: async ({ workspacePath, recipeId }) => {
    try {
      const data = await loadRecipes(workspacePath);
      const recipe = (data.overrides || []).find(r => r.id === recipeId);
      
      if (!recipe) {
        return {
          success: false,
          error: `Recipe with ID '${recipeId}' not found`
        };
      }
      
      return {
        success: true,
        recipe
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get recipe: ${error.message}`
      };
    }
  },

  create_recipe: async ({ workspacePath, recipe }) => {
    try {
      const data = await loadRecipes(workspacePath);
      
      // Generate ID if not provided
      if (!recipe.id) {
        recipe.id = `recipe_${Date.now()}`;
      }
      
      // Check if recipe with same ID already exists
      if ((data.overrides || []).some(r => r.id === recipe.id)) {
        return {
          success: false,
          error: `Recipe with ID '${recipe.id}' already exists`
        };
      }
      
      // Add default values for optional fields
      const newRecipe = {
        id: recipe.id,
        when_user_asks_about: recipe.when_user_asks_about,
        override_instructions: recipe.override_instructions,
        required_documents: recipe.required_documents || [],
        optional_documents: recipe.optional_documents || [],
        output_format: recipe.output_format || ''
      };
      
      // Add to overrides
      if (!data.overrides) {
        data.overrides = [];
      }
      data.overrides.push(newRecipe);
      
      // Save to file
      await saveRecipes(workspacePath, data);
      
      return {
        success: true,
        recipe: newRecipe,
        message: `Recipe '${newRecipe.id}' created successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create recipe: ${error.message}`
      };
    }
  },

  update_recipe: async ({ workspacePath, recipeId, updates }) => {
    try {
      const data = await loadRecipes(workspacePath);
      const recipeIndex = (data.overrides || []).findIndex(r => r.id === recipeId);
      
      if (recipeIndex === -1) {
        return {
          success: false,
          error: `Recipe with ID '${recipeId}' not found`
        };
      }
      
      // Update recipe with provided fields
      const existingRecipe = data.overrides[recipeIndex];
      const updatedRecipe = {
        ...existingRecipe,
        ...updates,
        id: existingRecipe.id // Ensure ID doesn't change
      };
      
      data.overrides[recipeIndex] = updatedRecipe;
      
      // Save to file
      await saveRecipes(workspacePath, data);
      
      return {
        success: true,
        recipe: updatedRecipe,
        message: `Recipe '${recipeId}' updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update recipe: ${error.message}`
      };
    }
  },

  get_recipe_documents: async ({ workspacePath, recipeId, includeOptional = true }) => {
    try {
      const data = await loadRecipes(workspacePath);
      const recipe = (data.overrides || []).find(r => r.id === recipeId);
      
      if (!recipe) {
        return {
          success: false,
          error: `Recipe with ID '${recipeId}' not found`
        };
      }
      
      const documents = {
        required: [],
        optional: []
      };
      
      // Load required documents
      for (const docPath of recipe.required_documents || []) {
        try {
          const fullPath = path.join(workspacePath, docPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          documents.required.push({
            path: docPath,
            content,
            exists: true
          });
        } catch (error) {
          documents.required.push({
            path: docPath,
            content: null,
            exists: false,
            error: error.message
          });
        }
      }
      
      // Load optional documents if requested
      if (includeOptional) {
        for (const docPath of recipe.optional_documents || []) {
          try {
            const fullPath = path.join(workspacePath, docPath);
            const content = await fs.readFile(fullPath, 'utf-8');
            documents.optional.push({
              path: docPath,
              content,
              exists: true
            });
          } catch (error) {
            documents.optional.push({
              path: docPath,
              content: null,
              exists: false,
              error: error.message
            });
          }
        }
      }
      
      return {
        success: true,
        recipe: {
          id: recipe.id,
          when_user_asks_about: recipe.when_user_asks_about,
          override_instructions: recipe.override_instructions,
          output_format: recipe.output_format
        },
        documents
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get recipe documents: ${error.message}`
      };
    }
  }
};