import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const CARD_NUMBER_PROMPT_TEXT = `
    # Placeholder: Card Number Capture

    This is a placeholder prompt for capturing the card number.
    Replace this text with the actual guidance for the agent.

    ## Next Step: Capture Card Number

    Instructions for capturing the card number go here.
    - Use the 'captureCardNumber' tool.
    - Remember to check status with 'getPaymentStatus'.

    Example dialogue:
    "Please provide the card number."
    `;

/**
 * Direct export for CardNumber prompt
 */
export function cardNumberPrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "CardNumber",
        description: "Prompt for capturing the card number",
        schema: undefined,
        execute: function (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: CARD_NUMBER_PROMPT_TEXT,
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
