import { EventEmitter } from 'events'; // Import EventEmitter
import { z } from 'zod'; // Import Zod
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the input schema internally using Zod
const startPaymentCaptureSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID")
});

// Infer the input type from the Zod schema
type StartPaymentCaptureInput = z.infer<typeof startPaymentCaptureSchema>;

// Define the expected structure for the tool's result (matching original callback + SDK expectation)
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

class StartPaymentCaptureTool extends EventEmitter {
    // Add a public property to hold the schema shape
    public readonly shape = startPaymentCaptureSchema.shape;

    private twilioAgentPaymentServer: TwilioAgentPaymentServer;

    constructor(
        twilioAgentPaymentServer: TwilioAgentPaymentServer,
    ) {
        super(); // Call EventEmitter constructor
        this.twilioAgentPaymentServer = twilioAgentPaymentServer;

        // Bind the execute method to ensure 'this' context is correct when used as a callback
        this.execute = this.execute.bind(this);
    }

    // Define as a regular async method with explicit parameter and return types
    async execute(params: StartPaymentCaptureInput, extra: any): Promise<ToolResult> {
        try {
            // params should be correctly typed as StartPaymentCaptureInput here
            const { callSid } = params;

            // Start the payment capture and get the payment session Sid
            const paymentInstance: PaymentInstance | null = await this.twilioAgentPaymentServer.startCapture(callSid);

            if (!paymentInstance) {
                this.emit(LOG_EVENT, { level: 'error', message: `Failed to start payment capture session for CallSid: ${callSid}` }); // Emit log event
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
            this.emit(LOG_EVENT, { level: 'info', message: `Started payment capture session ${paymentInstance.sid} for CallSid: ${callSid}` }); // Emit log event
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
            this.emit(LOG_EVENT, { level: 'error', message: `Error starting payment capture: ${errorMessage}` }); // Emit log event
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
    }
}

export { StartPaymentCaptureTool };
