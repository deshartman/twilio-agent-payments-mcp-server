import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the schema
const schema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID")
});

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

/**
 * Factory function that creates and returns everything needed for the CompletePaymentCapture tool
 */
export function completePaymentCaptureTool(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
    // Create an event emitter for logging
    const emitter = new EventEmitter();

    // Return everything needed for registration
    return {
        name: "completePaymentCapture",
        description: "Complete the payment capture process",
        shape: schema.shape,
        execute: async function execute(params: z.infer<typeof schema>, extra: any): Promise<ToolResult> {
            try {
                const { callSid, paymentSid } = params;

                // Complete the payment capture
                const paymentInstance: PaymentInstance | null = await twilioAgentPaymentServer.finishCapture(callSid, paymentSid);

                if (!paymentInstance) {
                    emitter.emit(LOG_EVENT, { level: 'error', message: `Failed to complete payment capture for PaymentSid: ${paymentSid}` });
                    return {
                        content: [{ type: "text", text: "Failed to complete payment capture." }],
                        isError: true
                    };
                }

                // Return the completion prompt with the token
                const paymentToken = (paymentInstance as any).paymentToken; // TODO: Address potential type issue
                emitter.emit(LOG_EVENT, { level: 'info', message: `Completed payment capture for PaymentSid: ${paymentSid}` });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            token: paymentToken,
                        }, null, 2)
                    }]
                };
            } catch (error: any) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                emitter.emit(LOG_EVENT, { level: 'error', message: `Error completing payment capture: ${errorMessage}` });
                return {
                    content: [{ type: "text", text: `Error completing payment capture: ${errorMessage}` }],
                    isError: true
                };
            }
        },
        emitter // For attaching event listeners
    }
}
