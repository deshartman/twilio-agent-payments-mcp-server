#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TwilioAgentPaymentServer } from "./api-servers/TwilioAgentPaymentServer.js";
import { LOG_EVENT, CALLBACK_EVENT, COMPONENT_REGISTERED_EVENT, COMPONENT_ERROR_EVENT } from './constants/events.js';
import { discoverComponents } from './utils/autoDiscovery.js';
import { fileURLToPath } from 'url';

// Get configuration parameters from the command line arguments
/****************************************************
 * 
 *                Twilio API Credentials
 *  
 ****************************************************/

// NOTE: we are enforcing use of API Keys here instead of Auth Token, as it is a better posture for message level sends
const accountSid = process.argv[2] || '';
const apiKey = process.argv[3] || '';
const apiSecret = process.argv[4] || '';

// Validate required configuration
if (!accountSid || !apiKey || !apiSecret) {
    console.error("Missing required configuration parameters");
    console.error("Usage: twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret>");
    process.exit(1);
}

// Server configuration with clear naming for the messaging service
const SERVER_CONFIG = {
    name: "TwilioAgentPaymentServer",
    description: "MCP server for capturing card details via Twilio API",
    version: "1.0.0"
};

const MCP_CAPABILITIES = { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } }

// Create the MCP server
const mcpServer = new McpServer(SERVER_CONFIG, MCP_CAPABILITIES);

// Helper function to forward logs to the MCP server
const logToMcp = (data: { level: string, message: string }) => {
    // Only use valid log levels: info, error, debug
    // If level is 'warn', treat it as 'info'
    const mcpLevel = data.level === 'warn' ? 'info' : data.level as "info" | "error" | "debug";

    // Send the log message to the MCP server's underlying Server instance
    mcpServer.server.sendLoggingMessage({
        level: mcpLevel,
        data: data.message,
    });
};

// Create the Twilio AgentPayment Server instance
const twilioAgentPaymentServer = new TwilioAgentPaymentServer(accountSid, apiKey, apiSecret);

// Start the MCP server
async function main() {
    try {
        // Auto-discover and register all components BEFORE connecting
        await discoverComponents(mcpServer, { twilioAgentPaymentServer });

        // Connect the transport after registering all components
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);

        // Now that the server is connected, set up event listeners
        twilioAgentPaymentServer.on(LOG_EVENT, logToMcp);
        twilioAgentPaymentServer.on(CALLBACK_EVENT, logToMcp);
    } catch (error) {
        // We can't use MCP logging here since the server isn't connected yet
        console.error(`Error starting server: ${error}`);
        process.exit(1);
    }
}

// Handle clean shutdown
process.on("SIGINT", async () => {
    // Log shutdown message
    logToMcp({ level: 'info', message: "TwilioAgentPaymentServer shutting down..." });
    await mcpServer.close();
    process.exit(0);
});

// Start the server
main().catch(error => {
    // We can't use MCP logging here since the server isn't connected yet
    console.error(`Fatal error: ${error}`);
    process.exit(1);
});
