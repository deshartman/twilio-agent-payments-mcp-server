import { EventEmitter } from 'events'; // Import EventEmitter
import { z } from 'zod'; // Import Zod
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";

// Define the input schema internally using Zod
const captureCardNumberSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    captureType: z.literal('payment-card-number').describe("The type of payment field to capture")
});

// Infer the input type from the Zod schema
type CaptureCardNumberInput = z.infer<typeof captureCardNumberSchema>;

// Define the expected structure for the tool's result (matching original callback + SDK expectation)
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

class CaptureCardNumberTool extends EventEmitter {
    // Add a public property to hold the schema shape
    public readonly shape = captureCardNumberSchema.shape;

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
    async execute(params: CaptureCardNumberInput, extra: any): Promise<ToolResult> {
        try {
            // params should be correctly typed as CaptureCardNumberInput here
            const { callSid, paymentSid } = params;

            // Update the payment session
            const paymentInstance: PaymentInstance | null = await this.twilioAgentPaymentServer.updatePaySession(
                callSid,
                paymentSid,
                'payment-card-number' // Use the literal type directly
            );

            if (!paymentInstance) {
                this.emit('log', { level: 'error', message: `Failed to start capture of card number for PaymentSid: ${paymentSid}` }); // Emit log event
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to start capture of card number`
                        }
                    ],
                    isError: true
                };
            }

            // Return success
            this.emit('log', { level: 'info', message: `Started capture of card number for PaymentSid: ${paymentSid}` }); // Emit log event
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                        }, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            // Log the error
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('log', { level: 'error', message: `Error updating payment field for card number: ${errorMessage}` }); // Emit log event
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating payment field: ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }
}

export { CaptureCardNumberTool };
