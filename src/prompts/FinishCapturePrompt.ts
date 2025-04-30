import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const FINISH_CAPTURE_PROMPT_TEXT = `
    # Placeholder: Finish Payment Capture

    This is a placeholder prompt for finishing the payment capture process.
    Replace this text with the actual guidance for the agent.

    ## Next Step: Complete Payment Capture

    Instructions for completing the capture go here.
    - Use the 'completePaymentCapture' tool.
    - Confirm the final status with 'getPaymentStatus'.

    Example dialogue:
    "Thank you, I have all the necessary details. I will now finalize the payment capture."
    `;

/**
 * Direct export for FinishCapture prompt
 */
export function finishCapturePrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "FinishCapture",
        description: "Prompt for finalizing the payment capture process",
        schema: undefined,
        execute: function (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: FINISH_CAPTURE_PROMPT_TEXT,
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
