#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"; // Import error types
import { z } from "zod";
import { TwilioAgentPaymentServer } from "./api-servers/TwilioAgentPaymentServer.js";
import { StartPaymentCaptureTool } from "./tools/StartPaymentCaptureTool.js";
import { CaptureCardNumberTool } from "./tools/CaptureCardNumberTool.js";
import { CaptureSecurityCodeTool } from "./tools/CaptureSecurityCodeTool.js";
import { CaptureExpirationDateTool } from "./tools/CaptureExpirationDateTool.js"; // Import the expiration date tool
import { CompletePaymentCaptureTool } from "./tools/CompletePaymentCaptureTool.js"; // Import the complete payment tool
import { LOG_EVENT, CALLBACK_EVENT } from './constants/events.js';


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

// // Initialize the status callback handler
// const statusCallback = new StatusCallback();

// // Set up event listeners for callback handler logs to MCP
// statusCallback.on('log', logToMcp);

// // Start the callback handler
// const statusCallbackUrl = statusCallback.getPublicUrl();

// Set up the callback Handler and get the statusCallback URL
// TODO:

// Create the Twilio AgentPayment Server instance
// Moved initialization here to be available for tool constructor
const twilioAgentPaymentServer = new TwilioAgentPaymentServer(accountSid, apiKey, apiSecret);

// Set up event listeners for Twilio agent payment server logs *after* initialization
twilioAgentPaymentServer.on(LOG_EVENT, logToMcp);

// TODO: Set up a callback handler event listener for the Twilio agent payment server


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

const MCP_CAPABILITIES = { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } }

const mcpServer = new McpServer(SERVER_CONFIG, MCP_CAPABILITIES);

// Define schemas for tool inputs



// Define schema for capture credit card number. You will have callSid, PaymentSid and captureType as "payment-card-number"


// Define schema for capture security code. You will have callSid, PaymentSid and captureType as "security-code"
// Define schema for capture expiration date. You will have callSid, PaymentSid and captureType as "expiration-date"
const captureExpirationDateSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    captureType: z.literal('expiration-date').describe("The type of payment field to capture")
});


const resetPaymentFieldSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    field: z.enum(['cardNumber', 'securityCode', 'expirationDate'] as const)
        .describe("The payment field to reset")
});

const completePaymentCaptureSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID")
});

const getPaymentStatusSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID")
});

/*****************************************
 * 
 *      Start Payment Capture Tool
 * 
 *****************************************/
const startPaymentCaptureTool = new StartPaymentCaptureTool(twilioAgentPaymentServer);
startPaymentCaptureTool.on(LOG_EVENT, logToMcp);
mcpServer.tool(
    "startPaymentCapture", // Use string literal for name
    "Start a new payment capture session", // Use string literal for description
    startPaymentCaptureTool.shape, // Reference the shape property from the tool instance
    startPaymentCaptureTool.execute // Use the bound execute method from the instance
);

/*****************************************
 *
 *      Capture Card Number Tool
 *
 *****************************************/
const captureCardNumberTool = new CaptureCardNumberTool(twilioAgentPaymentServer);
captureCardNumberTool.on(LOG_EVENT, logToMcp);
mcpServer.tool(
    "captureCardNumber", // Use string literal for name
    "Start capture of the payment session card number", // Use string literal for description
    captureCardNumberTool.shape, // Reference the shape property from the tool instance
    captureCardNumberTool.execute // Use the bound execute method from the instance
);

/*****************************************
 *
 *      Capture Security Code Tool
 *
 *****************************************/
const captureSecurityCodeTool = new CaptureSecurityCodeTool(twilioAgentPaymentServer);
captureSecurityCodeTool.on(LOG_EVENT, logToMcp);
mcpServer.tool(
    "captureSecurityCode",
    "Start capture of the payment session security code",
    captureSecurityCodeTool.shape,
    captureSecurityCodeTool.execute
);

/*****************************************
 *
 *      Capture Expiration Date Tool
 *
 *****************************************/
const captureExpirationDateTool = new CaptureExpirationDateTool(twilioAgentPaymentServer);
captureExpirationDateTool.on(LOG_EVENT, logToMcp);
mcpServer.tool(
    "captureExpirationDate",
    "Start capture of the payment session expiration date",
    captureExpirationDateTool.shape,
    captureExpirationDateTool.execute
);

/*****************************************
 *
 *      Complete Payment Capture Tool
 *
 *****************************************/
const completePaymentCaptureTool = new CompletePaymentCaptureTool(twilioAgentPaymentServer);
completePaymentCaptureTool.on(LOG_EVENT, logToMcp);
mcpServer.tool(
    "completePaymentCapture",
    "Complete the payment capture process",
    completePaymentCaptureTool.shape,
    completePaymentCaptureTool.execute
);


// Register resource templates
mcpServer.resource(
    "Payment Status",
    new ResourceTemplate("payment://{callSid}/{paymentSid}/status", { list: undefined }),
    { description: "Get the current status of a payment session" },
    async (uri, variables, extra) => {
        const callSid = variables.callSid as string;
        const paymentSid = variables.paymentSid as string;

        // Get the latest data from TwilioAgentPaymentServer
        const sessionStatusCallbackData = twilioAgentPaymentServer.getStatusCallbackData(paymentSid);

        if (!sessionStatusCallbackData) {
            // Throw an error if the session is not found, as expected by resource read
            throw new McpError(ErrorCode.InternalError, `Payment session state not found for SID: ${paymentSid}`);
        }

        const jsonContent = JSON.stringify(sessionStatusCallbackData, null, 2);

        return {
            contents: [
                {
                    uri: uri.toString(),
                    text: jsonContent,
                    mimeType: "application/json"
                }
            ]
        };
    }
);


// Start the MCP server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
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
