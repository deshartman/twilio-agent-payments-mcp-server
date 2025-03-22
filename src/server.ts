#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logOut, logError } from "./utils/logger.js";
import { TwilioAgentPaymentServer } from "./api-servers/TwilioAgentPaymentServer.js";

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
const statusCallback = `localhost:3000`;    // TODO: figure this out

// Validate required configuration
if (!accountSid || !apiKey || !apiSecret) {
    logError("TwilioAgentPaymentServer", "Missing required configuration parameters");
    console.error("Usage: twilio-messaging-mcp-server <accountSid> <apiKey> <apiSecret>");
    process.exit(1);
}

// Create the Twilio AgentPayment Server
const twilioAgentPaymentServer = new TwilioAgentPaymentServer(
    accountSid,
    apiKey,
    apiSecret,
    statusCallback);

/****************************************************
 * 
 *                      MCP server
 *  
 ****************************************************/

// Server configuration with clear naming for the messaging service
const SERVER_CONFIG = {
    name: "TwilioAgentPaymentServer",
    description: "MCP server for capturing card details via Twilio API",
    version: "1.0.0"
};

const mcpServer = new McpServer(SERVER_CONFIG);

// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        logOut("TwilioAgentPaymentServer", "Server started successfully");
    } catch (error) {
        logError("TwilioAgentPaymentServer", `Error starting server: ${error}`);
        process.exit(1);
    }
}

// Handle clean shutdown
process.on("SIGINT", async () => {
    logOut("TwilioAgentPaymentServer", "Shutting down...");
    await mcpServer.close();
    process.exit(0);
});

// Start the server
main().catch(error => {
    logError("TwilioAgentPaymentServer", `Fatal error: ${error}`);
    process.exit(1);
});
