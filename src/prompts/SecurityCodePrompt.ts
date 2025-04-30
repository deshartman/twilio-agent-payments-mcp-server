import { EventEmitter } from 'events';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const SECURITY_CODE_PROMPT_TEXT = `
    # Placeholder: Security Code Capture

    This is a placeholder prompt for capturing the security code (CVV/CVC).
    Replace this text with the actual guidance for the agent.

    ## Next Step: Capture Security Code

    Instructions for capturing the security code go here.
    - Use the 'captureSecurityCode' tool.
    - Remember to check status with 'getPaymentStatus'.

    Example dialogue:
    "Please provide the security code, usually found on the back of the card."
    `;

/**
 * Direct export for SecurityCode prompt
 */
export function securityCodePrompt() {
    // Create an event emitter for logging
    const emitter = new EventEmitter();
    return {
        name: "SecurityCode",
        description: "Prompt for capturing the card security code",
        schema: undefined,
        execute: function (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> {
            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: SECURITY_CODE_PROMPT_TEXT,
                        }
                    }
                ]
            };
        },
        emitter // For attaching event listeners
    };
};
