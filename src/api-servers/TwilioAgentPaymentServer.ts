import { Twilio } from "twilio";
import { logOut, logError } from '../utils/logger.js';
import { PaymentCapture, PaymentInstance, PaymentTokenType } from "twilio/lib/rest/api/v2010/account/call/payment.js";

/**
 * Service class for handling Twilio-related agent payment operations.
 * 
 * NOTE: For authentication we are using API Key and Secret. This is not recommended for production use. See https://www.twilio.com/docs/usage/requests-to-twilio
 * 
 * @class
 * @property {string} accountSid - Twilio account SID
 * @property {string} apiKey - Twilio API Key
 * @property {string} apiSecret - Twilio API Secret
 * @property {twilio.Twilio} twilioClient - Initialized Twilio client instance
 */
class TwilioAgentPaymentServer {
    accountSid: string;
    apiKey: string;
    apiSecret: string;
    twilioClient: Twilio;
    statusCallback: string;

    constructor(accountSid: string, apiKey: string, apiSecret: string, statusCallback: string) {
        this.accountSid = accountSid;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.statusCallback = statusCallback;
        this.twilioClient = new Twilio(apiKey, apiSecret, { accountSid: accountSid });
    }

    /*********************************************************************************************************************************************
        * 
        *       Agent assisted PAYMENTS
        * 
        *********************************************************************************************************************************************/

    /**
     * This starts the capture process based on the Call SID. This will create a payment session and return the session object.
     * The response will go back to`statusCallback` with the current "lastCall" path parameter and will be evaluated in evaluateStatusCallback here.
     * evaluateStatusCallback will then decide what to give to the LLM in terms of the next action.
     * @param callSid - The Twilio Call SID
     * @returns The payment session object or null if there was an error
     */
    async startCapture(callSid: string): Promise<PaymentInstance | null> {
        logOut('TwilioService', `Starting capture for callSID: ${callSid}`);
        // Create the payment session
        const sessionData = {
            idempotencyKey: callSid + Date.now().toString(),
            statusCallback: `${this.statusCallback}?lastCall=startCapture`,
            tokenType: process.env.TOKEN_TYPE as PaymentTokenType, // Always tokenise the card
            currency: process.env.CURRENCY,
            paymentConnector: process.env.PAYMENT_CONNECTOR,
            securityCode: true,
            postalCode: false
        }

        logOut('TwilioService', `Starting payment session for callSID: ${callSid} with data: ${JSON.stringify(sessionData)} `);

        // Now create the payment session
        try {
            const paymentSession = await this.twilioClient.calls(callSid)
                .payments
                .create(sessionData);
            return paymentSession;
        } catch (error) {
            logError('TwilioService', `Error with StartCapture for callSID: ${callSid} - ${error} `);
            return null;
        }
    }

    /**
     * Updates a payment session with the specified capture type
     * @param callSid - The Twilio Call SID
     * @param paymentSid - The Twilio Payment SID
     * @param captureType - The type of capture to perform
     * @returns The updated payment session object or null if there was an error
     */
    async updatePaySession(callSid: string, paymentSid: string, captureType: PaymentCapture): Promise<PaymentInstance | null> {
        // Check if there is a call in progress for this callSid
        const callResource = await this.twilioClient.calls(callSid).fetch();

        if (callResource.status !== 'in-progress') {
            logError('TwilioService', `startCapture error: Call not in progress for ${callSid}`);
            return null;
        }

        try {
            const paymentSession = await this.twilioClient
                .calls(callSid)
                .payments(paymentSid)
                .update({
                    capture: captureType,
                    idempotencyKey: callSid + Date.now().toString(),
                    statusCallback: `${this.statusCallback}?lastCall=${captureType} `,
                });

            return paymentSession; // Pay Object
        } catch (error) {
            logError('TwilioService', `Error with captureCard for callSID: ${callSid} - ${error} `);
            return null;
        }

    }

    /**
     * Completes a payment capture session
     * @param callSid - The Twilio Call SID
     * @param paymentSid - The Twilio Payment SID
     * @returns The completed payment object or null if there was an error
     */
    async finishCapture(callSid: string, paymentSid: string): Promise<PaymentInstance | null> {
        try {
            const payment = await this.twilioClient
                .calls(callSid)
                .payments(paymentSid)
                .update({
                    idempotencyKey: callSid + Date.now().toString(),
                    status: "complete",
                    statusCallback: `${this.statusCallback}?lastCall=finishCapture`,
                });
            return payment;
        } catch (error) {
            logError('TwilioService', `Error with finishCapture for callSID: ${callSid} - ${error} `);
            return null;
        }
    }


}

export { TwilioAgentPaymentServer };
