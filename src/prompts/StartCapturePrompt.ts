import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
// Remove the PromptCallback import as we'll define the function signature directly

const getStartCapturePromptText = (callSid: string) => `
    # Payment Card Capture Process

    I'll guide you through capturing the customer's payment card information securely.
    
    Call SID: ${callSid} (This will be used to generate a payment SID)

    ## Next Step: Start Payment Capture

    To begin the payment capture process:
    1. Ask the customer if they're ready to provide their payment card information
    2. Explain that their card details will be securely processed and tokenized
    3. Use the 'startPaymentCapture' tool to initiate the process
    4. **IMPORTANT**: After each field capture, use 'getPaymentStatus' to check if the field was successfully captured before proceeding to the next field

    Example dialogue:
    "I'll need to collect your payment card information now. Your card details will be securely processed and tokenized. Are you ready to proceed?"

    ## Important Notes
    - The payment capture process is asynchronous - after each API call, you must check the status
    - Always use 'getPaymentStatus' after each field update to verify completion
    - Do not proceed to the next field until the current field shows as complete
    `;

export class StartCapturePrompt {
    /**
     * The execute method provides the content for the 'StartCapture' prompt.
     * It guides the user on how to initiate the payment capture process.
     * 
     * @param args - Contains the callSid parameter
     * @param extra - Contains additional request context
     */
    public execute = (args: { callSid: string }, extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
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
    }
}
