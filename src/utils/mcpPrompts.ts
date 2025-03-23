import { PaymentSessionState } from './paymentStateStore.js';

/**
 * MCP Prompts for guiding the LLM through the payment flow
 */
class McpPrompts {
    /**
     * Gets a prompt for the current payment state
     * @param session The payment session state
     * @returns The prompt text
     */
    getPromptForState(session: PaymentSessionState): string {
        // Check for errors
        if (session.status === 'error') {
            return this.getErrorPrompt(session);
        }

        // Check for completion
        if (session.status === 'complete') {
            return this.getCompletionPrompt(session);
        }

        // Check for re-entry needs
        if (this.needsReentry(session)) {
            return this.getReentryPrompt(session);
        }

        // Determine the next step based on the current state
        if (!session.cardNumber.complete) {
            return this.getCardNumberPrompt(session);
        } else if (!session.securityCode.complete) {
            return this.getSecurityCodePrompt(session);
        } else if (!session.expirationDate.complete) {
            return this.getExpirationDatePrompt(session);
        } else {
            return this.getFinishCapturePrompt(session);
        }
    }

    /**
     * Checks if any field needs re-entry
     * @param session The payment session state
     * @returns True if re-entry is needed
     */
    private needsReentry(session: PaymentSessionState): boolean {
        return (
            session.cardNumber.needsReentry ||
            session.securityCode.needsReentry ||
            session.expirationDate.needsReentry
        );
    }

    /**
     * Gets a prompt for starting the payment capture
     * @returns The prompt text
     */
    getStartCapturePrompt(): string {
        return `
# Payment Card Capture Process

I'll guide you through capturing the customer's payment card information securely.

## Next Step: Start Payment Capture

To begin the payment capture process:
1. Ask the customer if they're ready to provide their payment card information
2. Explain that their card details will be securely processed and tokenized
3. Use the 'startPaymentCapture' tool to initiate the process

Example dialogue:
"I'll need to collect your payment card information now. Your card details will be securely processed and tokenized. Are you ready to proceed?"
`;
    }

    /**
     * Gets a prompt for capturing the card number
     * @param session The payment session state
     * @returns The prompt text
     */
    private getCardNumberPrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Card Number

The payment capture session has been initialized successfully.

## Current Status
- Payment SID: ${session.paymentSid}
- Status: ${session.status}

## Next Step: Capture Card Number

To capture the customer's card number:
1. Ask the customer to provide their 16-digit card number
2. Use the 'updatePaymentField' tool with type 'payment-card-number'
3. Wait for the system to process the card number

Example dialogue:
"Please provide your 16-digit card number. I'll wait while you enter it."

## Important Notes
- The card number will be masked in the system for security
- If the customer makes a mistake, you can reset the field using the 'resetPaymentField' tool
`;
    }

    /**
     * Gets a prompt for capturing the security code
     * @param session The payment session state
     * @returns The prompt text
     */
    private getSecurityCodePrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Security Code

The card number has been successfully captured.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Status: ${session.status}

## Next Step: Capture Security Code

To capture the customer's security code:
1. Ask the customer to provide the 3 or 4-digit security code on the back of their card
2. Use the 'updatePaymentField' tool with type 'security-code'
3. Wait for the system to process the security code

Example dialogue:
"Now, please provide the 3 or 4-digit security code found on the back of your card. I'll wait while you enter it."

## Important Notes
- The security code will be masked in the system for security
- If the customer makes a mistake, you can reset the field using the 'resetPaymentField' tool
`;
    }

    /**
     * Gets a prompt for capturing the expiration date
     * @param session The payment session state
     * @returns The prompt text
     */
    private getExpirationDatePrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Expiration Date

The security code has been successfully captured.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Security Code: ${session.securityCode.masked}
- Status: ${session.status}

## Next Step: Capture Expiration Date

To capture the customer's card expiration date:
1. Ask the customer to provide the expiration date in MM/YY format
2. Use the 'updatePaymentField' tool with type 'expiration-date'
3. Wait for the system to process the expiration date

Example dialogue:
"Finally, please provide your card's expiration date in the format MM/YY (for example, 05/25 for May 2025). I'll wait while you enter it."

## Important Notes
- The expiration date will be masked in the system for security
- If the customer makes a mistake, you can reset the field using the 'resetPaymentField' tool
`;
    }

    /**
     * Gets a prompt for finishing the payment capture
     * @param session The payment session state
     * @returns The prompt text
     */
    private getFinishCapturePrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Complete Process

All card details have been successfully captured.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Security Code: ${session.securityCode.masked}
- Expiration Date: ${session.expirationDate.masked}
- Status: ${session.status}

## Next Step: Complete Payment Capture

To complete the payment capture process:
1. Inform the customer that all details have been collected
2. Use the 'completePaymentCapture' tool to finalize the process
3. Wait for the system to generate the payment token

Example dialogue:
"Thank you! I've collected all the necessary card information. I'll now process this to complete the payment capture."

## Important Notes
- Upon successful completion, a payment token will be generated
- This token can be used for future transactions without requiring the full card details again
`;
    }

    /**
     * Gets a prompt for handling errors
     * @param session The payment session state
     * @returns The prompt text
     */
    private getErrorPrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Error

An error occurred during the payment capture process.

## Current Status
- Payment SID: ${session.paymentSid}
- Status: ${session.status}
- Error: ${session.errorMessage || 'Unknown error'}

## Next Steps

To handle this error:
1. Inform the customer about the issue
2. Offer to restart the payment capture process
3. Use the 'startPaymentCapture' tool to begin a new session

Example dialogue:
"I apologize, but we encountered an error while processing your payment information: ${session.errorMessage || 'There was a technical issue'}. Would you like to try again?"

## Important Notes
- It's important to reassure the customer that their information is secure
- If the error persists, suggest alternative payment methods if available
`;
    }

    /**
     * Gets a prompt for handling field re-entry
     * @param session The payment session state
     * @returns The prompt text
     */
    private getReentryPrompt(session: PaymentSessionState): string {
        // Determine which field needs re-entry
        if (session.cardNumber.needsReentry) {
            return `
# Payment Card Capture: Card Number Re-entry Required

There was an issue with the card number provided.

## Current Status
- Payment SID: ${session.paymentSid}
- Status: ${session.status}
- Issue: ${session.cardNumber.reentryReason || 'Invalid card number format'}
- Attempts: ${session.cardNumber.attempts}

## Next Step: Re-capture Card Number

To re-capture the customer's card number:
1. Inform the customer about the issue with their card number
2. Ask them to provide the card number again
3. Use the 'resetPaymentField' tool with field 'cardNumber'
4. Then use the 'updatePaymentField' tool with type 'payment-card-number'

Example dialogue:
"I'm sorry, but there seems to be an issue with the card number you provided: ${session.cardNumber.reentryReason || 'The format appears to be invalid'}. Could you please provide your 16-digit card number again?"

## Important Notes
- Be patient and supportive if the customer is having difficulties
- Suggest they check the card number carefully before re-entering
`;
        } else if (session.securityCode.needsReentry) {
            return `
# Payment Card Capture: Security Code Re-entry Required

There was an issue with the security code provided.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Status: ${session.status}
- Issue: ${session.securityCode.reentryReason || 'Invalid security code format'}
- Attempts: ${session.securityCode.attempts}

## Next Step: Re-capture Security Code

To re-capture the customer's security code:
1. Inform the customer about the issue with their security code
2. Ask them to provide the security code again
3. Use the 'resetPaymentField' tool with field 'securityCode'
4. Then use the 'updatePaymentField' tool with type 'security-code'

Example dialogue:
"I'm sorry, but there seems to be an issue with the security code you provided: ${session.securityCode.reentryReason || 'The format appears to be invalid'}. Could you please provide the 3 or 4-digit security code on the back of your card again?"

## Important Notes
- Remind the customer where to find the security code (usually on the back of the card)
- For American Express, the security code is 4 digits on the front of the card
`;
        } else if (session.expirationDate.needsReentry) {
            return `
# Payment Card Capture: Expiration Date Re-entry Required

There was an issue with the expiration date provided.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Security Code: ${session.securityCode.masked}
- Status: ${session.status}
- Issue: ${session.expirationDate.reentryReason || 'Invalid expiration date format'}
- Attempts: ${session.expirationDate.attempts}

## Next Step: Re-capture Expiration Date

To re-capture the customer's expiration date:
1. Inform the customer about the issue with their expiration date
2. Ask them to provide the expiration date again in MM/YY format
3. Use the 'resetPaymentField' tool with field 'expirationDate'
4. Then use the 'updatePaymentField' tool with type 'expiration-date'

Example dialogue:
"I'm sorry, but there seems to be an issue with the expiration date you provided: ${session.expirationDate.reentryReason || 'The format appears to be invalid'}. Could you please provide your card's expiration date again in the format MM/YY (for example, 05/25 for May 2025)?"

## Important Notes
- Remind the customer of the correct format (MM/YY)
- Check if the card might be expired, which could cause validation errors
`;
        } else {
            return this.getCardNumberPrompt(session);
        }
    }

    /**
     * Gets a prompt for completion
     * @param session The payment session state
     * @returns The prompt text
     */
    private getCompletionPrompt(session: PaymentSessionState): string {
        return `
# Payment Card Capture: Successfully Completed

The payment capture process has been successfully completed.

## Current Status
- Payment SID: ${session.paymentSid}
- Card Number: ${session.cardNumber.masked}
- Security Code: ${session.securityCode.masked}
- Expiration Date: ${session.expirationDate.masked}
- Status: ${session.status}
- Payment Token: ${session.token || 'Generated (masked for security)'}

## Next Steps

The payment capture is now complete. You can:
1. Inform the customer that their payment information has been successfully processed
2. Proceed with the next steps in your workflow (e.g., confirming the order, scheduling the service)
3. Store the payment token securely for future transactions

Example dialogue:
"Thank you! Your payment information has been successfully processed and securely stored. Your card ending in ${session.cardNumber.masked.slice(-4)} will be used for this transaction."

## Important Notes
- The payment token can be used for future transactions without requiring the full card details again
- Assure the customer that their payment information is secure
`;
    }
}

// Export a singleton instance
export const mcpPrompts = new McpPrompts();
