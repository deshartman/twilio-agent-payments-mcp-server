import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

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

export class SecurityCodePrompt {
    /**
     * The execute method provides the content for the 'SecurityCode' prompt.
     * It guides the user on how to capture the security code.
     */
    public execute: PromptCallback = (extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
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
    }
}
