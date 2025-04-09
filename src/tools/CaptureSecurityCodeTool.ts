import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the input schema internally using Zod
const captureSecurityCodeSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID"),
    captureType: z.literal('security-code').describe("The type of payment field to capture")
});

// Infer the input type from the Zod schema
type CaptureSecurityCodeInput = z.infer<typeof captureSecurityCodeSchema>;

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

class CaptureSecurityCodeTool extends EventEmitter {
    public readonly shape = captureSecurityCodeSchema.shape;
    private twilioAgentPaymentServer: TwilioAgentPaymentServer;

    constructor(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
        super();
        this.twilioAgentPaymentServer = twilioAgentPaymentServer;
        this.execute = this.execute.bind(this);
    }

    async execute(params: CaptureSecurityCodeInput, extra: any): Promise<ToolResult> {
        try {
            const { callSid, paymentSid } = params;

            // Update the payment session
            const paymentSession: PaymentInstance | null = await this.twilioAgentPaymentServer.updatePaySession(
                callSid,
                paymentSid,
                'security-code' // Use the literal type directly
            );

            if (!paymentSession) {
                this.emit(LOG_EVENT, { level: 'error', message: `Failed to start capture of security code for PaymentSid: ${paymentSid}` });
                return {
                    content: [{ type: "text", text: `Failed to start capture of security code` }],
                    isError: true
                };
            }

            this.emit(LOG_EVENT, { level: 'info', message: `Started capture of security code for PaymentSid: ${paymentSid}` });
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }]
            };
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit(LOG_EVENT, { level: 'error', message: `Error updating payment field for security code: ${errorMessage}` });
            return {
                content: [{ type: "text", text: `Error updating payment field: ${errorMessage}` }],
                isError: true
            };
        }
    }
}

export { CaptureSecurityCodeTool };
