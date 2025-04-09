import { EventEmitter } from 'events';
// Variables import removed
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"; // Uri removed, ErrorCode kept
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { LOG_EVENT } from '../constants/events.js'; // Keep for potential future logging within the method if needed

// Define the expected structure for the resource read result (can be inferred but good for clarity)
interface ResourceReadResult {
    contents: Array<{
        uri: string;
        text: string;
        mimeType: string;
    }>;
    [key: string]: any; // Add index signature for compatibility with SDK callback return type
}

class PaymentStatusResource extends EventEmitter {
    private twilioAgentPaymentServer: TwilioAgentPaymentServer;

    constructor(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
        super();
        this.twilioAgentPaymentServer = twilioAgentPaymentServer;
        // Bind the read method to ensure 'this' context is correct
        this.read = this.read.bind(this);
    }

    // This method now directly mirrors the original callback logic
    // Use the correct signature provided by the user
    async read(uri: URL, variables: Record<string, string | string[]>, extra: any): Promise<ResourceReadResult> {
        // uri type is URL
        // Ensure variables are treated as strings, handling potential string[] if necessary
        const callSid = String(variables.callSid);
        const paymentSid = String(variables.paymentSid);

        // Get the latest data from TwilioAgentPaymentServer (using 'this')
        const sessionStatusCallbackData = this.twilioAgentPaymentServer.getStatusCallbackData(paymentSid);

        if (!sessionStatusCallbackData) {
            // Throw an error if the session is not found, as expected by resource read
            // Using InternalError as per the original code snippet provided by the user
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
        // Note: No try/catch or logging added here as per user feedback to keep it minimal
        // Logging will be handled by the event listener attached in index.ts
    }
}

export { PaymentStatusResource };
