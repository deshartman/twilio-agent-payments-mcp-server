import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";

// Define the input schema internally using Zod
const captureExpirationDateSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    captureType: z.literal('expiration-date').describe("The type of payment field to capture")
});

// Infer the input type from the Zod schema
type CaptureExpirationDateInput = z.infer<typeof captureExpirationDateSchema>;

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

class CaptureExpirationDateTool extends EventEmitter {
    public readonly shape = captureExpirationDateSchema.shape;
    private twilioAgentPaymentServer: TwilioAgentPaymentServer;

    constructor(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
        super();
        this.twilioAgentPaymentServer = twilioAgentPaymentServer;
        this.execute = this.execute.bind(this);
    }

    async execute(params: CaptureExpirationDateInput, extra: any): Promise<ToolResult> {
        try {
            const { callSid, paymentSid } = params;

            // Update the payment session
            const paymentInstance: PaymentInstance | null = await this.twilioAgentPaymentServer.updatePaySession(
                callSid,
                paymentSid,
                'expiration-date' // Use the literal type directly
            );

            if (!paymentInstance) {
                this.emit('log', { level: 'error', message: `Failed to start capture of expiration date for PaymentSid: ${paymentSid}` });
                return {
                    content: [{ type: "text", text: `Failed to start capture of expiration date` }],
                    isError: true
                };
            }

            this.emit('log', { level: 'info', message: `Started capture of expiration date for PaymentSid: ${paymentSid}` });
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }]
            };
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('log', { level: 'error', message: `Error updating payment field for expiration date: ${errorMessage}` });
            return {
                content: [{ type: "text", text: `Error updating payment field: ${errorMessage}` }],
                isError: true
            };
        }
    }
}

export { CaptureExpirationDateTool };
