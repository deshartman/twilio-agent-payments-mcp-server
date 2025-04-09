import { EventEmitter } from 'events';
import { z } from 'zod';
import { TwilioAgentPaymentServer } from "../api-servers/TwilioAgentPaymentServer.js";
import { PaymentInstance } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT } from '../constants/events.js';

// Define the input schema internally using Zod
const completePaymentCaptureSchema = z.object({
    callSid: z.string().describe("The Twilio Call SID"),
    paymentSid: z.string().describe("The Twilio Payment SID")
});

// Infer the input type from the Zod schema
type CompletePaymentCaptureInput = z.infer<typeof completePaymentCaptureSchema>;

// Define the expected structure for the tool's result
interface ToolResult {
    content: Array<{ type: "text"; text: string; }>;
    isError?: boolean;
    [key: string]: any; // Add index signature for compatibility with SDK
}

class CompletePaymentCaptureTool extends EventEmitter {
    public readonly shape = completePaymentCaptureSchema.shape;
    private twilioAgentPaymentServer: TwilioAgentPaymentServer;

    constructor(twilioAgentPaymentServer: TwilioAgentPaymentServer) {
        super();
        this.twilioAgentPaymentServer = twilioAgentPaymentServer;
        this.execute = this.execute.bind(this);
    }

    async execute(params: CompletePaymentCaptureInput, extra: any): Promise<ToolResult> {
        try {
            const { callSid, paymentSid } = params;

            // Complete the payment capture
            const paymentInstance: PaymentInstance | null = await this.twilioAgentPaymentServer.finishCapture(callSid, paymentSid);

            if (!paymentInstance) {
                this.emit(LOG_EVENT, { level: 'error', message: `Failed to complete payment capture for PaymentSid: ${paymentSid}` });
                return {
                    content: [{ type: "text", text: "Failed to complete payment capture." }],
                    isError: true
                };
            }

            // Return the completion prompt with the token
            const paymentToken = (paymentInstance as any).paymentToken; // TODO: Address potential type issue
            this.emit(LOG_EVENT, { level: 'info', message: `Completed payment capture for PaymentSid: ${paymentSid}` });
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
            this.emit(LOG_EVENT, { level: 'error', message: `Error completing payment capture: ${errorMessage}` });
            return {
                content: [{ type: "text", text: `Error completing payment capture: ${errorMessage}` }],
                isError: true
            };
        }
    }
}

export { CompletePaymentCaptureTool };
