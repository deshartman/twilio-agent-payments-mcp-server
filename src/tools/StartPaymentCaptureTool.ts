import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the schema
const schema = z.object({
    callSid: z.string().describe("The Twilio Call SID")
});

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

/**
 * Factory function that creates and returns everything needed for the StartPaymentCapture tool
 */
export function startPaymentCaptureTool() {

    // Get the TwilioAgentPaymentServer instance
    const twilioAgentPaymentServer = TwilioAgentPaymentServer.getInstance();
    // Create an event emitter for logging
    const emitter = new EventEmitter();

    // tool<Args extends ZodRawShape>(name: string, description: string, paramsSchema: Args, cb: ToolCallback<Args>): void;

    // Return everything needed for registration
    return {
        name: "startPaymentCapture",
        description: "Start a new payment capture session",
        shape: schema.shape,
        execute: async function execute(params: z.infer<typeof schema>, extra: any): Promise<ToolResult> {
            try {
                const { callSid } = params;

                // Start the payment capture and get the payment session Sid
                const paymentInstance: PaymentInstance | null = await twilioAgentPaymentServer.startCapture(callSid);

                if (!paymentInstance) {
                    emitter.emit(LOG_EVENT, { level: 'error', message: `Failed to start payment capture session for CallSid: ${callSid}` });
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
                emitter.emit(LOG_EVENT, { level: 'info', message: `Started payment capture session ${paymentInstance.sid} for CallSid: ${callSid}` });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                paymentSid: paymentInstance.sid,
                            }, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                // Log the error
                const errorMessage = error instanceof Error ? error.message : String(error);
                emitter.emit(LOG_EVENT, { level: 'error', message: `Error starting payment capture: ${errorMessage}` });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error starting payment capture: ${errorMessage}`
                        }
                    ],
                    isError: true
                };
            }
        },
        emitter // For attaching event listeners
    }
}
