import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { EventEmitter } from 'events';
// import { COMPONENT_REGISTERED_EVENT, COMPONENT_ERROR_EVENT } from '../constants/events.js';

// Create an event emitter for the auto-discovery process
// export const discoveryEmitter = new EventEmitter();

/**
 * Discover and register all components (tools, prompts, resources) from their respective directories
 */
export async function discoverComponents(mcpServer: McpServer, dependencies: any) {
    // Get the current directory path
    const basePath: string = path.dirname(fileURLToPath(import.meta.url));
    const { twilioAgentPaymentServer } = dependencies;

    await Promise.all([
        discoverTools(mcpServer, path.join(basePath, 'tools'), twilioAgentPaymentServer),
        discoverPrompts(mcpServer, path.join(basePath, 'prompts')),
        discoverResources(mcpServer, path.join(basePath, 'resources'), twilioAgentPaymentServer)
    ]);
}

/**
 * Discover and register all tools from the tools directory
 */
async function discoverTools(mcpServer: McpServer, toolsPath: string, twilioAgentPaymentServer: any) {
    try {
        // Get all .js files in the tools directory
        const files = fs.readdirSync(toolsPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            try {
                // Import the module
                const modulePath = path.join(toolsPath, file);
                const module = await import(`file://${modulePath}`);

                // Process all exported functions
                for (const [exportName, exportedValue] of Object.entries(module)) {
                    // Skip if not a function
                    if (typeof exportedValue !== 'function') {
                        continue;
                    }

                    try {
                        // Call the function with dependencies
                        const tool = exportedValue(twilioAgentPaymentServer);

                        // Verify it has the expected structure
                        if (!tool || !tool.name || !tool.description || !tool.shape || !tool.execute) {
                            continue;
                        }

                        // Register the tool
                        mcpServer.tool(
                            tool.name,
                            tool.description,
                            tool.shape,
                            tool.execute
                        );
                    } catch (error) {
                        console.error(`Error processing export ${exportName} from ${file}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Error registering tool from file ${file}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error discovering tools:`, error);
    }
}

/**
 * Discover and register all prompts from the prompts directory
 */
async function discoverPrompts(mcpServer: McpServer, promptsPath: string) {
    try {
        // Get all .js files in the prompts directory
        const files = fs.readdirSync(promptsPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            try {
                // Import the module
                const modulePath = path.join(promptsPath, file);
                const module = await import(`file://${modulePath}`);

                // Process all exported functions
                for (const [exportName, exportedValue] of Object.entries(module)) {
                    // Skip if not a function
                    if (typeof exportedValue !== 'function') {
                        continue;
                    }

                    try {
                        // Call the function
                        const prompt = exportedValue();

                        // Verify it has the expected structure
                        if (!prompt || !prompt.name || !prompt.description || !prompt.execute) {
                            continue;
                        }

                        // Register the prompt
                        mcpServer.prompt(
                            prompt.name,
                            prompt.description,
                            prompt.schema || undefined,
                            prompt.execute
                        );
                    } catch (error) {
                        console.error(`Error processing export ${exportName} from ${file}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Error registering prompt from file ${file}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error discovering prompts:`, error);
    }
}

/**
 * Discover and register all resources from the resources directory
 */
async function discoverResources(mcpServer: McpServer, resourcesPath: string, twilioAgentPaymentServer: any) {
    try {
        // Get all .js files in the resources directory
        const files = fs.readdirSync(resourcesPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            try {
                // Import the module
                const modulePath = path.join(resourcesPath, file);
                const module = await import(`file://${modulePath}`);

                // Process all exported functions
                for (const [exportName, exportedValue] of Object.entries(module)) {
                    // Skip if not a function
                    if (typeof exportedValue !== 'function') {
                        continue;
                    }

                    try {
                        // Call the function with dependencies
                        const resource = exportedValue(twilioAgentPaymentServer);

                        // Verify it has the expected structure
                        if (!resource || !resource.name || !resource.template || !resource.description || !resource.read) {
                            continue;
                        }

                        // Register the resource
                        mcpServer.resource(
                            resource.name,
                            resource.template,
                            { description: resource.description },
                            resource.read
                        );
                    } catch (error) {
                        console.warn(`Error processing export ${exportName} from ${file}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Error registering resource from file ${file}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error discovering resources:`, error);
    }
}
