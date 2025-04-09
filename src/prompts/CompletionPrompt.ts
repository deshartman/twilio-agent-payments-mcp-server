import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

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

export class CompletionPrompt {
    /**
     * The execute method provides the content for the 'Completion' prompt.
     * It guides the user on how to handle the successful completion of the payment capture process.
     */
    public execute: PromptCallback = (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
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
    }
}
