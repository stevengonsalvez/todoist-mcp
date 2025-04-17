#!/usr/bin/env node

import express from 'express';
import dotenv from 'dotenv';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fetch from 'node-fetch';
import { z } from 'zod';

dotenv.config();

// Initialize Todoist API client
const todoistApiToken = process.env.TODOIST_API_TOKEN;
if (!todoistApiToken) {
    console.error('TODOIST_API_TOKEN is not set in the environment variables');
    process.exit(1);
}

const todoistApi = new TodoistApi(todoistApiToken);

// Create the MCP server
const server = new McpServer({
    name: "Todoist MCP Server",
    version: "1.0.0"
});

// Tasks
server.tool(
    "listTasks",
    {
        projectId: z.string().optional(),
        label: z.string().optional(),
        filter: z.string().optional()
    },
    async ({ projectId, label, filter }) => {
        try {
            // Only include parameters that have actual values
            const params: any = {};
            if (projectId) params.projectId = projectId;
            if (label) params.label = label;
            if (filter) params.filter = filter;

            const tasks = await todoistApi.getTasks(params);
            return { content: [{ type: "text", text: JSON.stringify({ tasks }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch tasks" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getTask",
    {
        taskId: z.string()
    },
    async ({ taskId }) => {
        try {
            const task = await todoistApi.getTask(taskId);
            return { content: [{ type: "text", text: JSON.stringify({ task }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching task:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch task" }],
                isError: true
            };
        }
    }
);

server.tool(
    "createTask",
    {
        content: z.string(),
        projectId: z.string().optional(),
        dueString: z.string().optional(),
        priority: z.number().optional(),
        labels: z.array(z.string()).optional(),
        description: z.string().optional(),
        order: z.number().optional(),
        parentId: z.string().optional(),
        sectionId: z.string().optional(),
        assigneeId: z.string().optional(),
        dueLang: z.string().optional(),
        dueDate: z.string().optional(),
        dueDatetime: z.string().optional()
    },
    async (params) => {
        try {
            // Create a properly typed task args object
            const taskArgs: any = { // Use any initially then set specific properties
                content: params.content
            };

            // Only add optional properties if they're defined
            if (params.projectId) taskArgs.projectId = params.projectId;
            if (params.dueString) taskArgs.dueString = params.dueString;
            if (params.priority) taskArgs.priority = params.priority;
            if (params.labels) taskArgs.labels = params.labels;
            if (params.description) taskArgs.description = params.description;
            if (params.order) taskArgs.order = params.order;
            if (params.parentId) taskArgs.parentId = params.parentId;
            if (params.sectionId) taskArgs.sectionId = params.sectionId;
            if (params.assigneeId) taskArgs.assigneeId = params.assigneeId;
            if (params.dueLang) taskArgs.dueLang = params.dueLang;

            // Only one of dueString, dueDate, dueDatetime can be used
            // dueString takes precedence, then dueDate, then dueDatetime
            if (params.dueString) {
                taskArgs.dueString = params.dueString;
            } else if (params.dueDate) {
                taskArgs.dueDate = params.dueDate;
            } else if (params.dueDatetime) {
                taskArgs.dueDatetime = params.dueDatetime;
            }

            const task = await todoistApi.addTask(taskArgs);
            return { content: [{ type: "text", text: JSON.stringify({ task }, null, 2) }] };
        } catch (error) {
            console.error('Error creating task:', error);
            return {
                content: [{ type: "text", text: "Failed to create task" }],
                isError: true
            };
        }
    }
);

server.tool(
    "updateTask",
    {
        taskId: z.string(),
        content: z.string().optional(),
        description: z.string().optional(),
        labels: z.array(z.string()).optional(),
        priority: z.number().optional(),
        dueString: z.string().optional(),
        dueLang: z.string().optional(),
        dueDate: z.string().optional(),
        dueDatetime: z.string().optional(),
        assigneeId: z.string().optional()
    },
    async (params) => {
        try {
            const { taskId, ...updateParams } = params;

            // Create a properly typed update args object
            const taskArgs: any = {}; // Use any initially then set specific properties

            // Only add optional properties if they're defined
            if (updateParams.content) taskArgs.content = updateParams.content;
            if (updateParams.description) taskArgs.description = updateParams.description;
            if (updateParams.labels) taskArgs.labels = updateParams.labels;
            if (updateParams.priority) taskArgs.priority = updateParams.priority;
            if ('assigneeId' in updateParams) taskArgs.assigneeId = updateParams.assigneeId;
            if (updateParams.dueLang) taskArgs.dueLang = updateParams.dueLang;

            // Only one of dueString, dueDate, dueDatetime can be used
            // dueString takes precedence, then dueDate, then dueDatetime
            if (updateParams.dueString) {
                taskArgs.dueString = updateParams.dueString;
            } else if (updateParams.dueDate) {
                taskArgs.dueDate = updateParams.dueDate;
            } else if (updateParams.dueDatetime) {
                taskArgs.dueDatetime = updateParams.dueDatetime;
            }

            const success = await todoistApi.updateTask(taskId, taskArgs);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error updating task:', error);
            return {
                content: [{ type: "text", text: "Failed to update task" }],
                isError: true
            };
        }
    }
);

server.tool(
    "completeTask",
    {
        taskId: z.string()
    },
    async ({ taskId }) => {
        try {
            const result = await todoistApi.closeTask(taskId);
            return { content: [{ type: "text", text: JSON.stringify({ success: result }, null, 2) }] };
        } catch (error) {
            console.error('Error completing task:', error);
            return {
                content: [{ type: "text", text: "Failed to complete task" }],
                isError: true
            };
        }
    }
);

server.tool(
    "reopenTask",
    {
        taskId: z.string()
    },
    async ({ taskId }) => {
        try {
            const result = await todoistApi.reopenTask(taskId);
            return { content: [{ type: "text", text: JSON.stringify({ success: result }, null, 2) }] };
        } catch (error) {
            console.error('Error reopening task:', error);
            return {
                content: [{ type: "text", text: "Failed to reopen task" }],
                isError: true
            };
        }
    }
);

server.tool(
    "deleteTask",
    {
        taskId: z.string()
    },
    async ({ taskId }) => {
        try {
            const result = await todoistApi.deleteTask(taskId);
            return { content: [{ type: "text", text: JSON.stringify({ success: result }, null, 2) }] };
        } catch (error) {
            console.error('Error deleting task:', error);
            return {
                content: [{ type: "text", text: "Failed to delete task" }],
                isError: true
            };
        }
    }
);

// Projects
server.tool(
    "listProjects",
    {},
    async () => {
        try {
            const projects = await todoistApi.getProjects();
            return { content: [{ type: "text", text: JSON.stringify({ projects }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching projects:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch projects" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getProject",
    {
        projectId: z.string()
    },
    async ({ projectId }) => {
        try {
            const project = await todoistApi.getProject(projectId);
            return { content: [{ type: "text", text: JSON.stringify({ project }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching project:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "createProject",
    {
        name: z.string(),
        parentId: z.string().optional(),
        color: z.string().optional(),
        isFavorite: z.boolean().optional(),
        viewStyle: z.enum(['list', 'board']).optional()
    },
    async (params) => {
        try {
            const project = await todoistApi.addProject({
                name: params.name,
                parentId: params.parentId,
                color: params.color,
                isFavorite: params.isFavorite,
                viewStyle: params.viewStyle,
            });
            return { content: [{ type: "text", text: JSON.stringify({ project }, null, 2) }] };
        } catch (error) {
            console.error('Error creating project:', error);
            return {
                content: [{ type: "text", text: "Failed to create project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "updateProject",
    {
        projectId: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        isFavorite: z.boolean().optional(),
        viewStyle: z.enum(['list', 'board']).optional()
    },
    async (params) => {
        try {
            const { projectId, ...updateParams } = params;
            const success = await todoistApi.updateProject(projectId, updateParams);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error updating project:', error);
            return {
                content: [{ type: "text", text: "Failed to update project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "archiveProject",
    {
        projectId: z.string()
    },
    async ({ projectId }) => {
        try {
            // The SDK doesn't directly expose archiveProject, so make a direct REST API call
            const response = await fetch(`https://api.todoist.com/rest/v2/projects/${projectId}/archive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${todoistApiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to archive project: ${response.statusText}`);
            }

            return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
        } catch (error) {
            console.error('Error archiving project:', error);
            return {
                content: [{ type: "text", text: "Failed to archive project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "unarchiveProject",
    {
        projectId: z.string()
    },
    async ({ projectId }) => {
        try {
            // The SDK doesn't directly expose unarchiveProject, so make a direct REST API call
            const response = await fetch(`https://api.todoist.com/rest/v2/projects/${projectId}/unarchive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${todoistApiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to unarchive project: ${response.statusText}`);
            }

            return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
        } catch (error) {
            console.error('Error unarchiving project:', error);
            return {
                content: [{ type: "text", text: "Failed to unarchive project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "deleteProject",
    {
        projectId: z.string()
    },
    async ({ projectId }) => {
        try {
            const success = await todoistApi.deleteProject(projectId);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error deleting project:', error);
            return {
                content: [{ type: "text", text: "Failed to delete project" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getProjectCollaborators",
    {
        projectId: z.string()
    },
    async ({ projectId }) => {
        try {
            const collaborators = await todoistApi.getProjectCollaborators(projectId);
            return { content: [{ type: "text", text: JSON.stringify({ collaborators }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching project collaborators:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch project collaborators" }],
                isError: true
            };
        }
    }
);

// Sections
server.tool(
    "listSections",
    {
        projectId: z.string().optional()
    },
    async ({ projectId }) => {
        try {
            if (projectId) {
                // @ts-ignore - Known issue with the type definitions
                const sections = await todoistApi.getSections({ projectId });
                return { content: [{ type: "text", text: JSON.stringify({ sections }, null, 2) }] };
            } else {
                // If no project ID is provided, just return empty array
                // Note: The SDK doesn't support listing all sections across all projects
                return { content: [{ type: "text", text: JSON.stringify({ sections: [] }, null, 2) }] };
            }
        } catch (error) {
            console.error('Error fetching sections:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch sections" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getSection",
    {
        sectionId: z.string()
    },
    async ({ sectionId }) => {
        try {
            const section = await todoistApi.getSection(sectionId);
            return { content: [{ type: "text", text: JSON.stringify({ section }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching section:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch section" }],
                isError: true
            };
        }
    }
);

server.tool(
    "createSection",
    {
        name: z.string(),
        projectId: z.string(),
        order: z.number().optional()
    },
    async (params) => {
        try {
            const section = await todoistApi.addSection({
                name: params.name,
                projectId: params.projectId,
                order: params.order,
            });
            return { content: [{ type: "text", text: JSON.stringify({ section }, null, 2) }] };
        } catch (error) {
            console.error('Error creating section:', error);
            return {
                content: [{ type: "text", text: "Failed to create section" }],
                isError: true
            };
        }
    }
);

server.tool(
    "updateSection",
    {
        sectionId: z.string(),
        name: z.string()
    },
    async ({ sectionId, name }) => {
        try {
            const success = await todoistApi.updateSection(sectionId, { name });
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error updating section:', error);
            return {
                content: [{ type: "text", text: "Failed to update section" }],
                isError: true
            };
        }
    }
);

server.tool(
    "deleteSection",
    {
        sectionId: z.string()
    },
    async ({ sectionId }) => {
        try {
            const success = await todoistApi.deleteSection(sectionId);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error deleting section:', error);
            return {
                content: [{ type: "text", text: "Failed to delete section" }],
                isError: true
            };
        }
    }
);

// Comments
server.tool(
    "listComments",
    {
        taskId: z.string().optional(),
        projectId: z.string().optional()
    },
    async (params) => {
        try {
            if (!params.taskId && !params.projectId) {
                return {
                    content: [{ type: "text", text: "Either taskId or projectId is required" }],
                    isError: true
                };
            }

            let comments;
            if (params.taskId) {
                comments = await todoistApi.getComments({ taskId: params.taskId });
            } else if (params.projectId) {
                comments = await todoistApi.getComments({ projectId: params.projectId });
            }

            return { content: [{ type: "text", text: JSON.stringify({ comments }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching comments:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch comments" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getComment",
    {
        commentId: z.string()
    },
    async ({ commentId }) => {
        try {
            const comment = await todoistApi.getComment(commentId);
            return { content: [{ type: "text", text: JSON.stringify({ comment }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching comment:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch comment" }],
                isError: true
            };
        }
    }
);

server.tool(
    "createComment",
    {
        content: z.string(),
        taskId: z.string().optional(),
        projectId: z.string().optional(),
        attachment: z.object({
            fileName: z.string().optional(),
            fileUrl: z.string(),
            fileType: z.string().optional(),
            resourceType: z.string().optional()
        }).optional()
    },
    async (params) => {
        try {
            if (!params.taskId && !params.projectId) {
                return {
                    content: [{ type: "text", text: "Either taskId or projectId is required" }],
                    isError: true
                };
            }

            // Create a properly typed comment args object
            const commentArgs: any = {
                content: params.content
            };

            // Only one of taskId or projectId should be set
            if (params.taskId) {
                commentArgs.taskId = params.taskId;
            } else if (params.projectId) {
                commentArgs.projectId = params.projectId;
            }

            if (params.attachment) {
                commentArgs.attachment = params.attachment;
            }

            const comment = await todoistApi.addComment(commentArgs);
            return { content: [{ type: "text", text: JSON.stringify({ comment }, null, 2) }] };
        } catch (error) {
            console.error('Error creating comment:', error);
            return {
                content: [{ type: "text", text: "Failed to create comment" }],
                isError: true
            };
        }
    }
);

server.tool(
    "updateComment",
    {
        commentId: z.string(),
        content: z.string()
    },
    async ({ commentId, content }) => {
        try {
            const success = await todoistApi.updateComment(commentId, { content });
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error updating comment:', error);
            return {
                content: [{ type: "text", text: "Failed to update comment" }],
                isError: true
            };
        }
    }
);

server.tool(
    "deleteComment",
    {
        commentId: z.string()
    },
    async ({ commentId }) => {
        try {
            const success = await todoistApi.deleteComment(commentId);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error deleting comment:', error);
            return {
                content: [{ type: "text", text: "Failed to delete comment" }],
                isError: true
            };
        }
    }
);

// Labels
server.tool(
    "listLabels",
    {},
    async () => {
        try {
            const labels = await todoistApi.getLabels();
            return { content: [{ type: "text", text: JSON.stringify({ labels }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching labels:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch labels" }],
                isError: true
            };
        }
    }
);

server.tool(
    "getLabel",
    {
        labelId: z.string()
    },
    async ({ labelId }) => {
        try {
            const label = await todoistApi.getLabel(labelId);
            return { content: [{ type: "text", text: JSON.stringify({ label }, null, 2) }] };
        } catch (error) {
            console.error('Error fetching label:', error);
            return {
                content: [{ type: "text", text: "Failed to fetch label" }],
                isError: true
            };
        }
    }
);

server.tool(
    "createLabel",
    {
        name: z.string(),
        color: z.string().optional(),
        order: z.number().optional(),
        isFavorite: z.boolean().optional()
    },
    async (params) => {
        try {
            const label = await todoistApi.addLabel({
                name: params.name,
                color: params.color,
                order: params.order,
                isFavorite: params.isFavorite,
            });
            return { content: [{ type: "text", text: JSON.stringify({ label }, null, 2) }] };
        } catch (error) {
            console.error('Error creating label:', error);
            return {
                content: [{ type: "text", text: "Failed to create label" }],
                isError: true
            };
        }
    }
);

server.tool(
    "updateLabel",
    {
        labelId: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
        isFavorite: z.boolean().optional()
    },
    async (params) => {
        try {
            const { labelId, ...updateParams } = params;
            const success = await todoistApi.updateLabel(labelId, updateParams);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error updating label:', error);
            return {
                content: [{ type: "text", text: "Failed to update label" }],
                isError: true
            };
        }
    }
);

server.tool(
    "deleteLabel",
    {
        labelId: z.string()
    },
    async ({ labelId }) => {
        try {
            const success = await todoistApi.deleteLabel(labelId);
            return { content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }] };
        } catch (error) {
            console.error('Error deleting label:', error);
            return {
                content: [{ type: "text", text: "Failed to delete label" }],
                isError: true
            };
        }
    }
);

// Shared Labels
server.tool(
    "getSharedLabels",
    {
        omitPersonal: z.boolean().optional()
    },
    async ({ omitPersonal }) => {
        try {
            // Using direct API call since the SDK doesn't expose this
            const url = new URL('https://api.todoist.com/rest/v2/labels/shared');
            if (omitPersonal) {
                url.searchParams.append('omit_personal', 'true');
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${todoistApiToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get shared labels: ${response.statusText}`);
            }

            const labels = await response.json();
            return { content: [{ type: "text", text: JSON.stringify({ labels }, null, 2) }] };
        } catch (error) {
            console.error('Error getting shared labels:', error);
            return {
                content: [{ type: "text", text: "Failed to get shared labels" }],
                isError: true
            };
        }
    }
);

server.tool(
    "renameSharedLabel",
    {
        name: z.string(),
        newName: z.string()
    },
    async ({ name, newName }) => {
        try {
            // Using direct API call since the SDK doesn't expose this
            const response = await fetch('https://api.todoist.com/rest/v2/labels/shared/rename', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${todoistApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    new_name: newName
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to rename shared label: ${response.statusText}`);
            }

            return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
        } catch (error) {
            console.error('Error renaming shared label:', error);
            return {
                content: [{ type: "text", text: "Failed to rename shared label" }],
                isError: true
            };
        }
    }
);

server.tool(
    "removeSharedLabel",
    {
        name: z.string()
    },
    async ({ name }) => {
        try {
            // Using direct API call since the SDK doesn't expose this
            const response = await fetch('https://api.todoist.com/rest/v2/labels/shared/remove', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${todoistApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to remove shared label: ${response.statusText}`);
            }

            return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
        } catch (error) {
            console.error('Error removing shared label:', error);
            return {
                content: [{ type: "text", text: "Failed to remove shared label" }],
                isError: true
            };
        }
    }
);

// Start the stdio server
const transport = new StdioServerTransport();

// Wrap in async main function to handle top-level await
async function main() {
    try {
        await server.connect(transport);
        console.error("Todoist MCP Server started with stdio transport");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    }
}

// Execute the main function
main(); 