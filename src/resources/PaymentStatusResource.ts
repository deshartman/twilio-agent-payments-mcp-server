import { EventEmitter } from 'events';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the expected structure for the resource read result
interface ResourceReadResult {
    contents: Array<{
        uri: string;
        text: string;
        mimeType: string;
    }>;
    [key: string]: any; // Add index signature for compatibility with SDK
}

/**
 * Factory function that creates and returns everything needed for the PaymentStatus resource
 */
export function paymentStatusResource(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
    // Create an event emitter for logging
    const emitter = new EventEmitter();

    // resource(name: string, template: ResourceTemplate, metadata: ResourceMetadata, readCallback: ReadResourceTemplateCallback): void;

    return {
        name: "PaymentStatus",
        template: new ResourceTemplate("payment://{callSid}/{paymentSid}/status", { list: undefined }),
        description: "Get the current status of a payment session",
        read: async (uri: URL, variables: Record<string, string | string[]>, extra: any): Promise<ResourceReadResult> => {
            const callSid = String(variables.callSid);
            const paymentSid = String(variables.paymentSid);

            const sessionStatusCallbackData = twilioAgentPaymentServer.getStatusCallbackData(paymentSid);

            if (!sessionStatusCallbackData) {
                throw new McpError(ErrorCode.InternalError, `Payment session state not found for SID: ${paymentSid}`);
            }

            const jsonContent = JSON.stringify(sessionStatusCallbackData, null, 2);

            return {
                contents: [{
                    uri: uri.toString(),
                    text: jsonContent,
                    mimeType: "application/json"
                }]
            };
        },
        emitter // For attaching event listeners
    };
}
