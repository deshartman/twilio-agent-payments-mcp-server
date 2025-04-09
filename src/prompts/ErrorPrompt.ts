import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

const ERROR_PROMPT_TEXT = `
    # Placeholder: Error Handling

    This is a placeholder prompt for handling errors during the payment capture process.
    Replace this text with the actual guidance for the agent.

    ## Error Recovery Steps

    Instructions for handling errors go here.
    - Check the error type and provide appropriate guidance.
    - Suggest recovery options based on the error.
    - Use 'getPaymentStatus' to verify the current state.

    Example dialogue:
    "I'm sorry, but there was an issue processing that information. Let's try again."
    `;

export class ErrorPrompt {
    /**
     * The execute method provides the content for the 'Error' prompt.
     * It guides the user on how to handle errors during the payment capture process.
     */
    public execute: PromptCallback = (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
        return {
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: ERROR_PROMPT_TEXT,
                    }
                }
            ]
        };
    }
}
