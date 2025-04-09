import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

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

export class ExpirationDatePrompt {
    /**
     * The execute method provides the content for the 'ExpirationDate' prompt.
     * It guides the user on how to capture the expiration date.
     */
    public execute: PromptCallback = (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
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
    }
}
