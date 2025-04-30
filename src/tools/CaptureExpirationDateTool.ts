import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the schema
const schema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
});

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

/**
 * Factory function that creates and returns everything needed for the CaptureExpirationDate tool
 */
export function captureExpirationDateTool() {

    // Get the TwilioAgentPaymentServer instance
    const twilioAgentPaymentServer = TwilioAgentPaymentServer.getInstance();
    // Create an event emitter for logging
    const emitter = new EventEmitter();

    // Return everything needed for registration
    return {
        name: "captureExpirationDate",
        description: "Start capture of the payment session expiration date",
        shape: schema.shape,
        execute: async function execute(params: z.infer<typeof schema>, extra: any): Promise<ToolResult> {
            try {
                const { callSid, paymentSid } = params;

                // Update the payment session
                const paymentInstance: PaymentInstance | null = await twilioAgentPaymentServer.updatePaySession(
                    callSid,
                    paymentSid,
                    'expiration-date' // Use the literal type directly
                );

                if (!paymentInstance) {
                    emitter.emit(LOG_EVENT, { level: 'error', message: `Failed to start capture of expiration date for PaymentSid: ${paymentSid}` });
                    return {
                        content: [{ type: "text", text: `Failed to start capture of expiration date` }],
                        isError: true
                    };
                }

                emitter.emit(LOG_EVENT, { level: 'info', message: `Started capture of expiration date for PaymentSid: ${paymentSid}` });
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }]
                };
            } catch (error: any) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                emitter.emit(LOG_EVENT, { level: 'error', message: `Error updating payment field for expiration date: ${errorMessage}` });
                return {
                    content: [{ type: "text", text: `Error updating payment field: ${errorMessage}` }],
                    isError: true
                };
            }
        },
        emitter // For attaching event listeners
    }
}
