import fs from 'fs/promises';
import path from 'path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { resolveWorkspace } from '../utils/helpers.js';

// Available colors from lib/colors.js
const AVAILABLE_COLORS = [
  'signalBlack', 'black', 'charcoal', 'midnight', 'darkSlate', 'darkTeal', 'earth', 'forest',
  'red', 'crimson', 'scarlet', 'ruby', 'burgundy', 'maroon', 'watermelon', 'coral', 'salmon', 'raspberry',
  'magenta', 'fuchsia', 'pink', 'blush', 'rose', 'hotPink', 'lightPink',
  'purple', 'amethystBellflower', 'violet', 'indigo', 'plum', 'orchid', 'lavender', 'lilac', 'darkPurple', 'royalPurple', 'taupe',
  'clementine', 'apricot', 'orange', 'tangerine', 'pumpkin', 'peach', 'papaya', 'burnt', 'rust', 'amber',
  'icing', 'lemonAndBanana', 'sunshine', 'smiles', 'canary', 'lemon', 'butter', 'cream', 'gold', 'mustard', 'saffron',
  'mint', 'meadow', 'lightMalachite', 'emerald', 'jade', 'lime', 'chartreuse', 'olive', 'darkGreen', 'forestGreen', 'sage', 'seafoam', 'tea',
  'azureCornflower', 'brightSky', 'seaBlue', 'cyan', 'blue', 'royal', 'navy', 'sky', 'powder', 'steel', 'denim', 'cobalt', 'cerulean', 'aqua', 'turquoise', 'teal',
  'cuppa', 'brown', 'chocolate', 'coffee', 'espresso', 'cinnamon', 'caramel', 'bronze', 'copper', 'tan', 'beige', 'sand',
  'moss', 'creamy', 'cotton', 'mushroom', 'white', 'gray', 'silver', 'platinum', 'darkGray', 'stone', 'ash', 'dove',
  'rose_gold', 'champagne', 'pearl', 'ivory', 'onyx'
];

/**
 * Simple Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const matrix = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Find the closest matching color from available colors
 */
function findClosestColor(inputColor) {
  if (!inputColor) return null;

  const input = inputColor.toLowerCase().trim();

  // Check for exact match first (case-insensitive)
  const exactMatch = AVAILABLE_COLORS.find(c => c.toLowerCase() === input);
  if (exactMatch) return exactMatch;

  // Check for partial match (color contains input or input contains color)
  const partialMatch = AVAILABLE_COLORS.find(c => {
    const color = c.toLowerCase();
    return color.includes(input) || input.includes(color);
  });
  if (partialMatch) return partialMatch;

  // Find closest match using Levenshtein distance
  let closestColor = AVAILABLE_COLORS[0];
  let minDistance = levenshteinDistance(input, closestColor);

  for (const color of AVAILABLE_COLORS) {
    const distance = levenshteinDistance(input, color);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  // Only return if distance is reasonable (< 5 edits)
  return minDistance < 5 ? closestColor : null;
}

/**
 * List all tasklists in a workspace
 * Tasklists are folders inside the documents directory containing a tasklist.json file
 */
export async function listTasklists(workspaceIdOrPath) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);
    const tasklists = [];

    // Tasklists are in the documents folder
    const documentsPath = path.join(workspace.path, 'documents');

    // Read all items in the documents directory
    const items = await fs.readdir(documentsPath, { withFileTypes: true });

    // Check each directory for a tasklist.json file
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        const tasklistConfigPath = path.join(documentsPath, item.name, 'tasklist.json');

        try {
          // Check if tasklist.json exists
          await fs.access(tasklistConfigPath);

          // Read the tasklist config
          const configContent = await fs.readFile(tasklistConfigPath, 'utf-8');
          const config = JSON.parse(configContent);

          // Count tasks and projects
          const taskCount = config.tasks?.length || 0;
          const projectCount = config.projects?.length || 0;
          const columnCount = config.columns?.length || 0;

          tasklists.push({
            name: config.name || item.name,
            path: path.join(documentsPath, item.name),
            relativePath: path.join('documents', item.name),
            taskCount,
            projectCount,
            columnCount,
            columns: config.columns?.map(col => col.name) || [],
            viewMode: config.viewMode || 'projects'
          });
        } catch (error) {
          // Not a tasklist directory or invalid config, skip it
          continue;
        }
      }
    }

    return {
      workspace: workspace.name,
      workspacePath: workspace.path,
      tasklists,
      count: tasklists.length
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to list tasklists: ${error.message}`);
  }
}

/**
 * Read a specific tasklist and return its full configuration and tasks
 */
export async function readTasklist(workspaceIdOrPath, tasklistNameOrPath) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Determine the tasklist path
    let tasklistPath;
    if (tasklistNameOrPath.startsWith('/') || tasklistNameOrPath.includes('\\')) {
      // It's a full path
      tasklistPath = tasklistNameOrPath;
    } else if (tasklistNameOrPath.startsWith('documents/')) {
      // It's already a relative path from workspace root
      tasklistPath = path.join(workspace.path, tasklistNameOrPath);
    } else {
      // It's just a name, assume it's in the documents folder
      tasklistPath = path.join(workspace.path, 'documents', tasklistNameOrPath);
    }

    // Read the tasklist.json config
    const configPath = path.join(tasklistPath, 'tasklist.json');
    let configContent;

    try {
      configContent = await fs.readFile(configPath, 'utf-8');
    } catch (error) {
      throw new Error(`Tasklist not found at "${tasklistPath}". Make sure the tasklist exists and contains a tasklist.json file.`);
    }

    const config = JSON.parse(configContent);

    // Build a mapping of column IDs to names
    const columnMap = (config.columns || []).reduce((acc, col) => {
      acc[col.id] = col.name;
      return acc;
    }, {});

    // Load task files and combine with metadata
    const tasks = [];

    // Helper function to load tasks from a folder
    const loadTasksFromFolder = async (folderPath, projectName, parentProject = null) => {
      try {
        const items = await fs.readdir(folderPath, { withFileTypes: true });

        for (const item of items) {
          if (item.isFile() && item.name.endsWith('.md')) {
            const taskPath = path.join(folderPath, item.name);
            const relativePath = path.relative(workspace.path, taskPath);
            const taskName = item.name.replace('.md', '');

            // Find task metadata in config
            const taskMetadata = config.tasks?.find(t => {
              const normalizedConfigPath = t.path.replace(/\\/g, '/');
              const normalizedRelativePath = relativePath.replace(/\\/g, '/');
              return normalizedConfigPath === normalizedRelativePath;
            }) || {};

            // Read task content to get word count
            let wordCount = 0;
            let hasContent = false;
            try {
              const content = await fs.readFile(taskPath, 'utf-8');
              const trimmedContent = content.trim();
              hasContent = trimmedContent.length > 0;
              // Simple word count - split by whitespace
              if (hasContent) {
                wordCount = trimmedContent.split(/\s+/).length;
              }
            } catch (error) {
              // If we can't read the file, just skip the content
            }

            // Get emoji from registry if available
            let emoji = '🎯';
            try {
              const registryPath = path.join(workspace.path, 'documents-registry.json');
              const registryContent = await fs.readFile(registryPath, 'utf-8');
              const registry = JSON.parse(registryContent);
              const normalizedRelativePath = relativePath.replace(/\\/g, '/');
              const doc = registry.documents?.find(d => {
                const normalizedDocPath = d.path?.replace(/\\/g, '/');
                return normalizedDocPath === normalizedRelativePath;
              });
              if (doc && doc.emoji) {
                emoji = doc.emoji;
              }
            } catch (error) {
              // Registry doesn't exist or couldn't be read, use default emoji
            }

            const statusName = columnMap[taskMetadata.status] || taskMetadata.status || 'Unknown';

            tasks.push({
              name: taskName,
              path: relativePath,
              emoji,
              status: statusName,
              statusId: taskMetadata.status,
              project: projectName,
              parentProject: parentProject?.name || null,
              priority: taskMetadata.priority || 'medium',
              assignedTo: taskMetadata.assignedTo || '',
              startDate: taskMetadata.startDate || '',
              endDate: taskMetadata.endDate || '',
              isRecurring: taskMetadata.isRecurring || false,
              recurrenceFrequency: taskMetadata.recurrenceFrequency || null,
              lastCompletedDate: taskMetadata.lastCompletedDate || null,
              lastResetDate: taskMetadata.lastResetDate || null,
              hasContent,
              wordCount
            });
          }
        }
      } catch (error) {
        // Folder doesn't exist or can't be read, skip it
        console.error(`Error reading folder ${folderPath}:`, error);
      }
    };

    // Load root-level tasks
    await loadTasksFromFolder(tasklistPath, null);

    // Load project tasks
    if (config.projects && config.projects.length > 0) {
      for (const project of config.projects) {
        const projectPath = path.join(tasklistPath, project.name);
        await loadTasksFromFolder(projectPath, project.name, project);
      }
    }

    // Group tasks by status for better organization
    const tasksByStatus = {};
    tasks.forEach(task => {
      const statusName = task.status;
      if (!tasksByStatus[statusName]) {
        tasksByStatus[statusName] = [];
      }
      tasksByStatus[statusName].push(task);
    });

    return {
      workspace: workspace.name,
      workspacePath: workspace.path,
      tasklistName: config.name,
      tasklistPath: path.relative(workspace.path, tasklistPath),
      columns: (config.columns || []).map(col => ({
        name: col.name,
        id: col.id,
        color: col.color,
        isDoneColumn: col.isDoneColumn || false
      })),
      projects: (config.projects || []).map(proj => ({
        name: proj.name,
        emoji: proj.emoji
      })),
      viewMode: config.viewMode || 'projects',
      tasks,
      tasksByStatus,
      totalTasks: tasks.length,
      summary: {
        totalTasks: tasks.length,
        totalProjects: config.projects?.length || 0,
        totalColumns: config.columns?.length || 0,
        taskCountByStatus: Object.entries(tasksByStatus).map(([status, statusTasks]) => ({
          status,
          count: statusTasks.length
        }))
      },
      _note: 'To read task content: Use read_document tool with the workspace and task.path value. Each task includes hasContent and wordCount fields to indicate if there is content to read. To modify tasks: Use update_task_status to move tasks between columns, and update_task_metadata to change priority, assignments, dates, and recurring settings.'
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to read tasklist: ${error.message}`);
  }
}

/**
 * Update task status (move task to a different column)
 */
export async function updateTaskStatus(workspaceIdOrPath, tasklistNameOrPath, taskName, newStatus) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Determine the tasklist path
    let tasklistPath;
    if (tasklistNameOrPath.startsWith('/') || tasklistNameOrPath.includes('\\')) {
      tasklistPath = tasklistNameOrPath;
    } else if (tasklistNameOrPath.startsWith('documents/')) {
      tasklistPath = path.join(workspace.path, tasklistNameOrPath);
    } else {
      tasklistPath = path.join(workspace.path, 'documents', tasklistNameOrPath);
    }

    // Read the tasklist.json config
    const configPath = path.join(tasklistPath, 'tasklist.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Find the task in the config
    const task = config.tasks?.find(t => {
      const taskFileName = path.basename(t.path, '.md');
      return taskFileName.toLowerCase() === taskName.toLowerCase();
    });

    if (!task) {
      throw new Error(`Task "${taskName}" not found in tasklist. Available tasks: ${config.tasks?.map(t => path.basename(t.path, '.md')).join(', ') || 'none'}`);
    }

    // Find the new status column ID
    const newStatusColumn = config.columns?.find(col =>
      col.name.toLowerCase() === newStatus.toLowerCase()
    );

    if (!newStatusColumn) {
      const availableStatuses = config.columns?.map(col => col.name).join(', ') || 'none';
      throw new Error(`Status "${newStatus}" not found. Available statuses: ${availableStatuses}`);
    }

    // Update the task status
    const oldStatus = task.status;
    task.status = newStatusColumn.id;

    // Write back to tasklist.json
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      taskName: path.basename(task.path, '.md'),
      oldStatus: config.columns?.find(col => col.id === oldStatus)?.name || oldStatus,
      newStatus: newStatusColumn.name,
      message: `Task "${taskName}" moved from "${config.columns?.find(col => col.id === oldStatus)?.name || oldStatus}" to "${newStatusColumn.name}"`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to update task status: ${error.message}`);
  }
}

/**
 * Update task metadata (priority, assignedTo, dates, recurring settings)
 */
export async function updateTaskMetadata(workspaceIdOrPath, tasklistNameOrPath, taskName, metadata) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Determine the tasklist path
    let tasklistPath;
    if (tasklistNameOrPath.startsWith('/') || tasklistNameOrPath.includes('\\')) {
      tasklistPath = tasklistNameOrPath;
    } else if (tasklistNameOrPath.startsWith('documents/')) {
      tasklistPath = path.join(workspace.path, tasklistNameOrPath);
    } else {
      tasklistPath = path.join(workspace.path, 'documents', tasklistNameOrPath);
    }

    // Read the tasklist.json config
    const configPath = path.join(tasklistPath, 'tasklist.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Find the task in the config
    const task = config.tasks?.find(t => {
      const taskFileName = path.basename(t.path, '.md');
      return taskFileName.toLowerCase() === taskName.toLowerCase();
    });

    if (!task) {
      throw new Error(`Task "${taskName}" not found in tasklist. Available tasks: ${config.tasks?.map(t => path.basename(t.path, '.md')).join(', ') || 'none'}`);
    }

    const updatedFields = [];

    // Update priority
    if (metadata.priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(metadata.priority)) {
        throw new Error(`Invalid priority "${metadata.priority}". Must be low, medium, or high.`);
      }
      task.priority = metadata.priority;
      updatedFields.push('priority');
    }

    // Update assignedTo
    if (metadata.assignedTo !== undefined) {
      task.assignedTo = metadata.assignedTo;
      updatedFields.push('assignedTo');
    }

    // Update startDate
    if (metadata.startDate !== undefined) {
      if (metadata.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.startDate)) {
        throw new Error(`Invalid startDate format "${metadata.startDate}". Use YYYY-MM-DD.`);
      }
      task.startDate = metadata.startDate;
      updatedFields.push('startDate');
    }

    // Update endDate
    if (metadata.endDate !== undefined) {
      if (metadata.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.endDate)) {
        throw new Error(`Invalid endDate format "${metadata.endDate}". Use YYYY-MM-DD.`);
      }
      task.endDate = metadata.endDate;
      updatedFields.push('endDate');
    }

    // Update recurring settings
    if (metadata.isRecurring !== undefined) {
      task.isRecurring = metadata.isRecurring;
      updatedFields.push('isRecurring');
      // Clear endDate if setting to recurring
      if (metadata.isRecurring) {
        task.endDate = '';
      }
    }

    if (metadata.recurrenceFrequency !== undefined) {
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(metadata.recurrenceFrequency)) {
        throw new Error(`Invalid recurrenceFrequency "${metadata.recurrenceFrequency}". Must be daily, weekly, monthly, or yearly.`);
      }
      task.recurrenceFrequency = metadata.recurrenceFrequency;
      updatedFields.push('recurrenceFrequency');
    }

    // Write back to tasklist.json
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      taskName: path.basename(task.path, '.md'),
      updatedFields,
      message: `Task "${taskName}" updated. Changed fields: ${updatedFields.join(', ')}`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to update task metadata: ${error.message}`);
  }
}

/**
 * Create a new tasklist in a workspace
 */
export async function createTasklist(workspaceIdOrPath, tasklistData) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Validate name
    if (!tasklistData.name || !tasklistData.name.trim()) {
      throw new Error('Tasklist name is required');
    }

    // Tasklist path is always in documents/{name}
    const tasklistPath = path.join(workspace.path, 'documents', tasklistData.name);

    // Check if tasklist already exists
    try {
      await fs.access(tasklistPath);
      throw new Error(`Tasklist "${tasklistData.name}" already exists`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, we can create it
    }

    // Create the tasklist directory
    await fs.mkdir(tasklistPath, { recursive: true });

    // Build columns array - use provided columns or defaults
    let columns;
    if (tasklistData.columns && Array.isArray(tasklistData.columns) && tasklistData.columns.length > 0) {
      columns = tasklistData.columns.map((col, index) => {
        if (!col.name || !col.name.trim()) {
          throw new Error(`Column at index ${index} is missing a name`);
        }

        // Generate ID from name if not provided
        const columnId = col.id || col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const column = {
          id: columnId,
          name: col.name,
          isDoneColumn: col.isDoneColumn || false  // Always include isDoneColumn, default to false
        };

        // Fuzzy match color if provided
        if (col.color) {
          const matchedColor = findClosestColor(col.color);
          if (matchedColor) {
            column.color = matchedColor;
          }
          // If no match found, just omit the color rather than using invalid value
        }

        return column;
      });

      // Ensure at least one column is marked as done
      const hasDoneColumn = columns.some(col => col.isDoneColumn === true);
      if (!hasDoneColumn) {
        // Mark the last column as done by default
        columns[columns.length - 1].isDoneColumn = true;
      }
    } else {
      // Default columns (matching NavigationSidebar.js and KanbanBoard.js defaults)
      columns = [
        { id: 'todo', name: 'To Do', isDoneColumn: false },
        { id: 'in-progress', name: 'In Progress', isDoneColumn: false },
        { id: 'done', name: 'Done', isDoneColumn: true }
      ];
    }

    // Create initial tasklist config
    const config = {
      name: tasklistData.name,
      columns,
      projects: [],
      tasks: [],
      viewMode: tasklistData.viewMode || 'projects'
    };

    // Write tasklist.json
    const configPath = path.join(tasklistPath, 'tasklist.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return {
      success: true,
      tasklistName: tasklistData.name,
      tasklistPath: path.join('documents', tasklistData.name),
      columns: columns.map(c => ({ name: c.name, id: c.id })),
      columnCount: columns.length,
      message: `Tasklist "${tasklistData.name}" created successfully with ${columns.length} column(s)`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to create tasklist: ${error.message}`);
  }
}

/**
 * Add a new task to a tasklist
 */
export async function addTask(workspaceIdOrPath, tasklistNameOrPath, taskData) {
  try {
    const workspace = await resolveWorkspace(workspaceIdOrPath);

    // Determine the tasklist path
    let tasklistPath;
    if (tasklistNameOrPath.startsWith('/') || tasklistNameOrPath.includes('\\')) {
      tasklistPath = tasklistNameOrPath;
    } else if (tasklistNameOrPath.startsWith('documents/')) {
      tasklistPath = path.join(workspace.path, tasklistNameOrPath);
    } else {
      tasklistPath = path.join(workspace.path, 'documents', tasklistNameOrPath);
    }

    // Read the tasklist.json config
    const configPath = path.join(tasklistPath, 'tasklist.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Validate task name
    if (!taskData.name || !taskData.name.trim()) {
      throw new Error('Task name is required');
    }

    // Determine status/column
    let statusId;
    if (taskData.status) {
      const column = config.columns?.find(col =>
        col.name.toLowerCase() === taskData.status.toLowerCase()
      );
      if (!column) {
        const availableStatuses = config.columns?.map(col => col.name).join(', ') || 'none';
        throw new Error(`Status "${taskData.status}" not found. Available statuses: ${availableStatuses}`);
      }
      statusId = column.id;
    } else {
      // Default to first column
      statusId = config.columns?.[0]?.id;
      if (!statusId) {
        throw new Error('No columns available in tasklist');
      }
    }

    // Validate priority if provided
    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      throw new Error(`Invalid priority "${taskData.priority}". Must be low, medium, or high.`);
    }

    // Validate recurrence frequency if provided
    if (taskData.recurrenceFrequency && !['daily', 'weekly', 'monthly', 'yearly'].includes(taskData.recurrenceFrequency)) {
      throw new Error(`Invalid recurrenceFrequency "${taskData.recurrenceFrequency}". Must be daily, weekly, monthly, or yearly.`);
    }

    // Validate date formats if provided
    if (taskData.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(taskData.startDate)) {
      throw new Error(`Invalid startDate format "${taskData.startDate}". Use YYYY-MM-DD.`);
    }
    if (taskData.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(taskData.endDate)) {
      throw new Error(`Invalid endDate format "${taskData.endDate}". Use YYYY-MM-DD.`);
    }

    // Determine folder path (project or root)
    const project = taskData.project || null;
    const folderPath = project ? path.join(tasklistPath, project) : tasklistPath;

    // Ensure folder exists if it's a project
    if (project) {
      try {
        await fs.mkdir(folderPath, { recursive: true });
      } catch (error) {
        // Folder might already exist
      }
    }

    // Create task file
    const fileName = `${taskData.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.md`;
    const taskPath = path.join(folderPath, fileName);
    const relativeTaskPath = path.relative(workspace.path, taskPath).replace(/\\/g, '/');

    // Create empty markdown file
    await fs.writeFile(taskPath, taskData.content || '', 'utf-8');

    // Update document registry if emoji or description provided
    if (taskData.emoji || taskData.description) {
      const registryPath = path.join(workspace.path, 'documents-registry.json');
      let registry = { documents: [] };

      try {
        const registryContent = await fs.readFile(registryPath, 'utf-8');
        registry = JSON.parse(registryContent);
      } catch (error) {
        // Registry doesn't exist yet, use default
      }

      if (!registry.documents) {
        registry.documents = [];
      }

      // Add or update document entry
      let doc = registry.documents.find(d => d.path === relativeTaskPath);
      if (doc) {
        if (taskData.emoji) doc.emoji = taskData.emoji;
        if (taskData.description) doc.description = taskData.description;
      } else {
        const newDoc = {
          path: relativeTaskPath,
          name: taskData.name
        };
        if (taskData.emoji) newDoc.emoji = taskData.emoji;
        if (taskData.description) newDoc.description = taskData.description;
        registry.documents.push(newDoc);
      }

      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
    }

    // Add task metadata to tasklist.json
    const taskMetadata = {
      path: relativeTaskPath,
      status: statusId,
      priority: taskData.priority || 'medium',
      assignedTo: taskData.assignedTo || '',
      startDate: taskData.startDate || '',
      endDate: taskData.endDate || '',
      isRecurring: taskData.isRecurring || false,
      recurrenceFrequency: taskData.recurrenceFrequency || null,
      lastResetDate: taskData.isRecurring ? new Date().toISOString().split('T')[0] : null
    };

    if (project) {
      taskMetadata.project = project;
    }

    if (!config.tasks) {
      config.tasks = [];
    }
    config.tasks.push(taskMetadata);

    // Add project to projects array if it doesn't exist
    if (project) {
      if (!config.projects) {
        config.projects = [];
      }
      if (!config.projects.find(p => p.name === project)) {
        config.projects.push({ name: project });
      }
    }

    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return {
      success: true,
      taskName: taskData.name,
      taskPath: relativeTaskPath,
      status: config.columns?.find(col => col.id === statusId)?.name || statusId,
      project: project,
      message: `Task "${taskData.name}" created successfully${project ? ` in project "${project}"` : ''}`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to add task: ${error.message}`);
  }
}

// Tool definitions
export const tasklistTools = [
  {
    name: 'create_tasklist',
    description: 'Create a new tasklist (kanban board) in a workspace. The tasklist will be created in documents/{name}. Do NOT ask for or accept a path - only the name and column configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        },
        tasklist: {
          type: 'object',
          description: 'Tasklist configuration',
          properties: {
            name: {
              type: 'string',
              description: 'Tasklist name (required, will be used as folder name in documents/)'
            },
            columns: {
              type: 'array',
              description: 'Column definitions (optional, defaults to To Do, In Progress, Done)',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Column name (required)'
                  },
                  id: {
                    type: 'string',
                    description: 'Column ID (optional, auto-generated from name if not provided)'
                  },
                  color: {
                    type: 'string',
                    description: 'Column color name (optional). Fuzzy matching supported.'
                  },
                  isDoneColumn: {
                    type: 'boolean',
                    description: 'Whether this is a "done" column (optional, default: false)'
                  }
                },
                required: ['name']
              }
            },
            viewMode: {
              type: 'string',
              enum: ['projects', 'flat'],
              description: 'View mode for the tasklist (optional, default: "projects")'
            }
          },
          required: ['name']
        }
      },
      required: ['workspace', 'tasklist']
    }
  },
  {
    name: 'list_tasklists',
    description: 'List all tasklists (kanban boards) in a workspace. Returns overview of each tasklist including name, task count, project count, and available columns.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        }
      },
      required: ['workspace']
    }
  },
  {
    name: 'read_tasklist',
    description: 'Read a complete tasklist (kanban board) structure including columns, projects, and task metadata. Returns all task metadata (status, priority, assignments, dates, recurring info) but NOT task content. IMPORTANT: Tasks are markdown documents - use read_document with the task path to read content.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        },
        tasklist: {
          type: 'string',
          description: 'Tasklist name or relative path within the workspace (e.g., "Mobile Tasks" or "documents/Mobile Tasks")'
        }
      },
      required: ['workspace', 'tasklist']
    }
  },
  {
    name: 'update_task_status',
    description: 'Move a task to a different column/status in a tasklist. Updates the tasklist.json configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        },
        tasklist: {
          type: 'string',
          description: 'Tasklist name or relative path (e.g., "Mobile Tasks")'
        },
        taskName: {
          type: 'string',
          description: 'Name of the task to move (case-insensitive)'
        },
        newStatus: {
          type: 'string',
          description: 'New status/column name (e.g., "To Do", "In Progress", "Done")'
        }
      },
      required: ['workspace', 'tasklist', 'taskName', 'newStatus']
    }
  },
  {
    name: 'update_task_metadata',
    description: 'Update task metadata including priority, assignedTo, dates, and recurring settings. Cannot change task name. Updates the tasklist.json configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        },
        tasklist: {
          type: 'string',
          description: 'Tasklist name or relative path (e.g., "Mobile Tasks")'
        },
        taskName: {
          type: 'string',
          description: 'Name of the task to update (case-insensitive)'
        },
        metadata: {
          type: 'object',
          description: 'Metadata fields to update. Only provide fields you want to change.',
          properties: {
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level'
            },
            assignedTo: {
              type: 'string',
              description: 'User assigned to this task'
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (cleared if isRecurring is true)'
            },
            isRecurring: {
              type: 'boolean',
              description: 'Whether this is a recurring task'
            },
            recurrenceFrequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'How often the task recurs (only used when isRecurring is true)'
            }
          }
        }
      },
      required: ['workspace', 'tasklist', 'taskName', 'metadata']
    }
  },
  {
    name: 'add_task',
    description: 'Create a new task in a tasklist. The task will be created as a markdown file and added to the tasklist configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace path, name, or ID'
        },
        tasklist: {
          type: 'string',
          description: 'Tasklist name or relative path (e.g., "Mobile Tasks")'
        },
        task: {
          type: 'object',
          description: 'Task data',
          properties: {
            name: {
              type: 'string',
              description: 'Task name (required, will be used as filename)'
            },
            content: {
              type: 'string',
              description: 'Task content/description (markdown)'
            },
            status: {
              type: 'string',
              description: 'Initial status/column for the task (e.g., "To Do", "In Progress", "Done"). If not provided, defaults to first column.'
            },
            emoji: {
              type: 'string',
              description: 'Emoji to display next to the task (e.g., "📝", "🔥", "✅")'
            },
            description: {
              type: 'string',
              description: 'Task description (shown in registry)'
            },
            project: {
              type: 'string',
              description: 'Project name this task belongs to. Task will be created in a subfolder with this project name.'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level (default: medium)'
            },
            assignedTo: {
              type: 'string',
              description: 'User assigned to this task'
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (not used for recurring tasks)'
            },
            isRecurring: {
              type: 'boolean',
              description: 'Whether this is a recurring task (default: false)'
            },
            recurrenceFrequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'How often the task recurs (only used when isRecurring is true)'
            }
          },
          required: ['name']
        }
      },
      required: ['workspace', 'tasklist', 'task']
    }
  }
];

// Tool handlers
export const tasklistHandlers = {
  create_tasklist: async (args) => createTasklist(args.workspace, args.tasklist),
  list_tasklists: async (args) => listTasklists(args.workspace),
  read_tasklist: async (args) => readTasklist(args.workspace, args.tasklist),
  update_task_status: async (args) => updateTaskStatus(args.workspace, args.tasklist, args.taskName, args.newStatus),
  update_task_metadata: async (args) => updateTaskMetadata(args.workspace, args.tasklist, args.taskName, args.metadata),
  add_task: async (args) => addTask(args.workspace, args.tasklist, args.task)
};
