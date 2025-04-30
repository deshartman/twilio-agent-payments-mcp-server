import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from 'zod';

// Helper function for prompt text
function getStartCapturePromptText(callSid: string) {
    return `
    # Payment Card Capture Process

    I'll guide you through capturing the customer's payment card information securely.
    
    Call SID: ${callSid} (This will be used to generate a payment SID)

    ## Next Step: Start Payment Capture

    To begin the payment capture process:
    1. Ask the customer if they're ready to provide their payment card information
    2. Explain that their card details will be securely processed and tokenized
    3. When ready, use the 'startPaymentCapture' tool to initiate the process
    4. **IMPORTANT**: After each field capture, use 'getPaymentStatus' resource to check if the field was successfully captured before proceeding to the next field.

    Example dialogue:
    "I'll need to collect your payment card information now. Your card details will be securely processed and tokenized. Are you ready to proceed?"

    ## Important Notes
    - The payment capture process is asynchronous - after each API call, you must check the status
    - Always use 'getPaymentStatus' resource after each field update to verify completion
    - Do not proceed to the next field until the current field shows as complete
    `;
}

/**
 * Direct export for StartCapture prompt
 */
export function startCapturePrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "StartCapture",
        description: "Prompt for starting the payment capture process",
        schema: { callSid: z.string().describe("The Twilio Call SID") },
        execute: function (args: { callSid: string }, extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            const { callSid } = args;

            if (!callSid) {
                throw new Error("callSid parameter is required");
            }

            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: getStartCapturePromptText(callSid),
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
