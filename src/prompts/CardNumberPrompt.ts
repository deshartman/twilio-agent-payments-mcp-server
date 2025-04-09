import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

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

export class CardNumberPrompt {
    /**
     * The execute method provides the content for the 'CardNumber' prompt.
     * It guides the user on how to capture the card number.
     */
    public execute: PromptCallback = (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
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
    }
}
