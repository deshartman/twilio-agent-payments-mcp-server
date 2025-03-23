#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TwilioAgentPaymentServer } from "./api-servers/TwilioAgentPaymentServer.js";
import { paymentStateStore } from "./utils/paymentStateStore.js";
import { callbackHandler } from "./utils/callbackHandler.js";
import { mcpPrompts } from "./utils/mcpPrompts.js";
import { PaymentCapture } from "twilio/lib/rest/api/v2010/account/call/payment.js";

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
const statusCallback = `http://localhost:3000`;

// Validate required configuration
if (!accountSid || !apiKey || !apiSecret) {
    console.error("Missing required configuration parameters");
    console.error("Usage: twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret>");
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

const mcpServer = new McpServer(SERVER_CONFIG, {
    capabilities: {
        logging: {}
    }
});

// Define schemas for tool inputs
const startPaymentCaptureSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID")
});

const updatePaymentFieldSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    captureType: z.enum(['payment-card-number', 'security-code', 'expiration-date'] as const)
        .describe("The type of payment field to capture")
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

// Register tools
mcpServer.tool(
    "startPaymentCapture",
    "Start a new payment capture session",
    startPaymentCaptureSchema.shape,
    async (params, extra) => {
        try {
            const { callSid } = params;

            // Start the payment capture
            const paymentSession = await twilioAgentPaymentServer.startCapture(callSid);

            if (!paymentSession) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Failed to start payment capture session."
                        }
                    ],
                    isError: true
                };
            }

            // Return the payment SID and prompt
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            paymentSid: paymentSession.sid,
                            prompt: mcpPrompts.getStartCapturePrompt()
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            // Log the error
            forwardLogToMcp({ level: 'error', message: `Error starting payment capture: ${error}` });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error starting payment capture: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
);

mcpServer.tool(
    "updatePaymentField",
    "Update a payment field (card number, security code, or expiration date)",
    updatePaymentFieldSchema.shape,
    async (params, extra) => {
        try {
            const { callSid, paymentSid, captureType } = params;

            // Update the payment session
            const paymentSession = await twilioAgentPaymentServer.updatePaySession(
                callSid,
                paymentSid,
                captureType as PaymentCapture
            );

            if (!paymentSession) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update payment field: ${captureType}`
                        }
                    ],
                    isError: true
                };
            }

            // Get the session state
            const sessionState = paymentStateStore.getSession(callSid, paymentSid);

            if (!sessionState) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Payment session not found in state store."
                        }
                    ],
                    isError: true
                };
            }

            // Return the prompt for the current state
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            prompt: mcpPrompts.getPromptForState(sessionState)
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            // Log the error
            forwardLogToMcp({ level: 'error', message: `Error updating payment field: ${error}` });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating payment field: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
);

mcpServer.tool(
    "resetPaymentField",
    "Reset a payment field for re-entry (card number, security code, or expiration date)",
    resetPaymentFieldSchema.shape,
    async (params, extra) => {
        try {
            const { callSid, paymentSid, field } = params;

            // Reset the field in the state store
            const updatedSession = paymentStateStore.resetField(callSid, paymentSid, field);

            if (!updatedSession) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to reset payment field: ${field}`
                        }
                    ],
                    isError: true
                };
            }

            // Map the field to a capture type
            let captureType: PaymentCapture = 'payment-card-number'; // Default initialization
            switch (field) {
                case 'cardNumber':
                    captureType = 'payment-card-number';
                    break;
                case 'securityCode':
                    captureType = 'security-code';
                    break;
                case 'expirationDate':
                    captureType = 'expiration-date';
                    break;
            }

            // Update the payment session to reset the field
            const paymentSession = await twilioAgentPaymentServer.updatePaySession(
                callSid,
                paymentSid,
                captureType
            );

            if (!paymentSession) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to reset payment field: ${field}`
                        }
                    ],
                    isError: true
                };
            }

            // Return the prompt for the current state
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            prompt: mcpPrompts.getPromptForState(updatedSession)
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            // Log the error
            forwardLogToMcp({ level: 'error', message: `Error resetting payment field: ${error}` });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error resetting payment field: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
);

mcpServer.tool(
    "completePaymentCapture",
    "Complete the payment capture process",
    completePaymentCaptureSchema.shape,
    async (params, extra) => {
        try {
            const { callSid, paymentSid } = params;

            // Complete the payment capture
            const paymentSession = await twilioAgentPaymentServer.finishCapture(callSid, paymentSid);

            if (!paymentSession) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Failed to complete payment capture."
                        }
                    ],
                    isError: true
                };
            }

            // Get the session state
            const sessionState = paymentStateStore.getSession(callSid, paymentSid);

            if (!sessionState) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Payment session not found in state store."
                        }
                    ],
                    isError: true
                };
            }

            // Return the completion prompt
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            token: sessionState.token || paymentSession.sid,
                            prompt: mcpPrompts.getPromptForState(sessionState)
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            // Log the error
            forwardLogToMcp({ level: 'error', message: `Error completing payment capture: ${error}` });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error completing payment capture: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
);

mcpServer.tool(
    "getPaymentStatus",
    "Get the current status of a payment session",
    getPaymentStatusSchema.shape,
    async (params, extra) => {
        try {
            const { callSid, paymentSid } = params;

            // Get the session state
            const sessionState = paymentStateStore.getSession(callSid, paymentSid);

            if (!sessionState) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Payment session not found in state store."
                        }
                    ],
                    isError: true
                };
            }

            // Return the session state and prompt
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: sessionState.status,
                            cardNumber: sessionState.cardNumber,
                            securityCode: sessionState.securityCode,
                            expirationDate: sessionState.expirationDate,
                            token: sessionState.token,
                            prompt: mcpPrompts.getPromptForState(sessionState)
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            // Log the error
            forwardLogToMcp({ level: 'error', message: `Error getting payment status: ${error}` });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting payment status: ${error}`
                    }
                ],
                isError: true
            };
        }
    }
);

// Register resource templates
mcpServer.resource(
    "Payment Status",
    new ResourceTemplate("payment://{callSid}/{paymentSid}/status", { list: undefined }),
    { description: "Get the current status of a payment session" },
    async (uri, variables, extra) => {
        const callSid = variables.callSid as string;
        const paymentSid = variables.paymentSid as string;

        // Get the session state
        const sessionState = paymentStateStore.getSession(callSid, paymentSid);

        if (!sessionState) {
            throw new Error(`Payment session not found: ${callSid}/${paymentSid}`);
        }

        const jsonContent = JSON.stringify({
            status: sessionState.status,
            cardNumber: sessionState.cardNumber,
            securityCode: sessionState.securityCode,
            expirationDate: sessionState.expirationDate,
            token: sessionState.token,
            lastUpdated: sessionState.lastUpdated
        }, null, 2);

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

mcpServer.resource(
    "Payment Prompt",
    new ResourceTemplate("payment://{callSid}/{paymentSid}/prompt", { list: undefined }),
    { description: "Get the prompt for the current payment state" },
    async (uri, variables, extra) => {
        const callSid = variables.callSid as string;
        const paymentSid = variables.paymentSid as string;

        // Get the session state
        const sessionState = paymentStateStore.getSession(callSid, paymentSid);

        if (!sessionState) {
            throw new Error(`Payment session not found: ${callSid}/${paymentSid}`);
        }

        return {
            contents: [
                {
                    uri: uri.toString(),
                    text: mcpPrompts.getPromptForState(sessionState),
                    mimeType: "text/markdown"
                }
            ]
        };
    }
);

// Define schemas for prompt inputs
const paymentSessionSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID")
});

// Register prompts using the built-in prompt method
mcpServer.prompt(
    "StartCapture",
    "Prompt for starting the payment capture process",
    (extra) => {
        return {
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: mcpPrompts.getStartCapturePrompt()
                    }
                }
            ]
        };
    }
);

mcpServer.prompt(
    "PaymentState",
    paymentSessionSchema.shape,
    (args, extra) => {
        const { callSid, paymentSid } = args;
        const sessionState = paymentStateStore.getSession(callSid, paymentSid);

        if (!sessionState) {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: "Payment session not found."
                        }
                    }
                ]
            };
        }

        return {
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: mcpPrompts.getPromptForState(sessionState)
                    }
                }
            ]
        };
    }
);

// Helper function to forward logs to the MCP server
const forwardLogToMcp = (data: { level: string, message: string }) => {
    // Only use valid log levels: info, error, debug
    // If level is 'warn', treat it as 'info'
    const mcpLevel = data.level === 'warn' ? 'info' : data.level as "info" | "error" | "debug";

    // Send the log message to the MCP server's underlying Server instance
    mcpServer.server.sendLoggingMessage({
        level: mcpLevel,
        data: data.message,
    });
};

// Set up event listeners for callback handler logs
callbackHandler.on('log', forwardLogToMcp);

// Set up event listeners for Twilio agent payment server logs
twilioAgentPaymentServer.on('log', forwardLogToMcp);

// Start the callback handler
callbackHandler.start();

// Start the server
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
    forwardLogToMcp({ level: 'info', message: "TwilioAgentPaymentServer shutting down..." });
    callbackHandler.stop();
    await mcpServer.close();
    process.exit(0);
});

// Start the server
main().catch(error => {
    // We can't use MCP logging here since the server isn't connected yet
    console.error(`Fatal error: ${error}`);
    process.exit(1);
});
