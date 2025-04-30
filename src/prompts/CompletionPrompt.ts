import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const COMPLETION_PROMPT_TEXT = `
    # Placeholder: Payment Capture Completion

    This is a placeholder prompt for the payment capture completion.
    Replace this text with the actual guidance for the agent.

    ## Payment Successfully Completed

    Instructions for handling the successful completion go here.
    - Confirm the payment has been successfully processed.
    - Provide next steps for the customer.
    - Explain what happens next with their payment.

    Example dialogue:
    "Great news! Your payment information has been successfully captured and securely tokenized. The payment will be processed shortly."
    `;

/**
 * Direct export for Completion prompt
 */
export function completionPrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "Completion",
        description: "Prompt for payment capture completion",
        schema: undefined,
        execute: function (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: COMPLETION_PROMPT_TEXT,
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
