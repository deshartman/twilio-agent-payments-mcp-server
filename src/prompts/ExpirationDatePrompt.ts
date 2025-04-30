import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const EXPIRATION_DATE_PROMPT_TEXT = `
    # Placeholder: Expiration Date Capture

    This is a placeholder prompt for capturing the expiration date.
    Replace this text with the actual guidance for the agent.

    ## Next Step: Capture Expiration Date

    Instructions for capturing the expiration date go here.
    - Use the 'captureExpirationDate' tool.
    - Remember to check status with 'getPaymentStatus'.

    Example dialogue:
    "Please provide the expiration date in MM/YY format."
    `;

/**
 * Direct export for ExpirationDate prompt
 */
export function expirationDatePrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "ExpirationDate",
        description: "Prompt for capturing the card expiration date",
        schema: undefined,
        execute: function (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: EXPIRATION_DATE_PROMPT_TEXT,
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
