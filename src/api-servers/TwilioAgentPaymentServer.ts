/* NOTE: The Twilio package is a CommonJS module, but we're using ES modules (type: "module" in package.json).
 When importing a CommonJS module in an ES module context, we can't use named imports directly.
 Instead, we import the entire module as a default import and then extract the named exports.
 */
import pkg from 'twilio';
const { Twilio } = pkg;
import { EventEmitter } from 'events';
import { PaymentCapture, PaymentInstance, PaymentTokenType } from "twilio/lib/rest/api/v2010/account/call/payment.js";

/**
 * Interface for the Twilio Payment Token
 * Based on the Twilio API documentation: https://www.twilio.com/docs/voice/api/payment-resource
 */
export interface PaymentToken {
    type: string;         // The type of token (e.g., "one-time", "reusable")
    token: string;        // The actual token value
    dateCreated?: string; // ISO date string when the token was created
    dateUpdated?: string; // ISO date string when the token was last updated
    accountSid?: string;  // The Twilio account SID
    paymentSid?: string;  // The payment SID this token is associated with
    callSid?: string;     // The call SID this token is associated with
}
import {
    CallbackHandler,
    CallbackHandlerOptions,
    LogEventData,
    CallbackEventData,
    TunnelStatusEventData
} from '@deshartman/mcp-status-callback';

// import { paymentStateStore } from "../utils/paymentStateStore.js";

/**
 * Service class for handling Twilio-related agent payment operations.
 * Extends EventEmitter to emit events that can be consumed by the main application
 * 
 * NOTE: For authentication we are using API Key and Secret. This is not recommended for production use. See https://www.twilio.com/docs/usage/requests-to-twilio
 * 
 * Since there are also statusCallback messages as part of the API, this class has to handle these, so using a utility 
 * class for the status callback, MCP Status Callback, which is a wrapper around Ngrok tunnel.
 * 
 * This class is responsible for:
 * - Starting the payment capture process
 * - Updating the payment session with the specified capture type
 * - Completing the payment capture session
 * - Processing callbacks from Twilio
 * - Handling different callback types (startCapture, payment-card-number, security-code, expiration-date, finishCapture)
 * - Emitting log events for different actions
 * - Managing the payment session state
 * 
 * The architectural 
 * 
 * @class
 * @property {string} accountSid - Twilio account SID
 * @property {string} apiKey - Twilio API Key
 * @property {string} apiSecret - Twilio API Secret
 * @property {twilio.Twilio} twilioClient - Initialized Twilio client instance
 */
class TwilioAgentPaymentServer extends EventEmitter {
    accountSid: string;
    apiKey: string;
    apiSecret: string;
    twilioClient: any; // Using 'any' type for the Twilio client since we don't have proper type definitions
    statusCallback: string;
    // A callback Map to hold the status callback data. The key is they payment SID and the data is JSON of any type
    statusCallbackData: Map<string, any>;

    tokenType: PaymentTokenType; // Always tokenise the card
    currency: string;
    paymentConnector: string;



    constructor(accountSid: string, apiKey: string, apiSecret: string) {
        super();
        this.accountSid = accountSid;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.statusCallback = "";

        this.tokenType = process.env.TOKEN_TYPE as PaymentTokenType; // Always tokenise the card
        this.currency = process.env.CURRENCY as string;
        this.paymentConnector = process.env.PAYMENT_CONNECTOR as string;

        this.twilioClient = new Twilio(apiKey, apiSecret, { accountSid: accountSid });
        this.statusCallbackData = new Map();

        // Get environment variables for Ngrok configuration
        const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
        const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

        if (!ngrokAuthToken) {
            console.error('NGROK_AUTH_TOKEN environment variable is required');
            process.exit(1);
        }

        // Create a new instance with typed options
        const options: CallbackHandlerOptions = {
            ngrokAuthToken: ngrokAuthToken, // Replace with your actual Ngrok auth token
            customDomain: customDomain // Optional custom domain
        };

        const callbackHandler = new CallbackHandler(options);

        // Set up event listeners with proper typing
        callbackHandler.on('log', (data: LogEventData) => {
            const { level, message } = data;
            console.log(`[${level.toUpperCase()}] ${message}`);
        });

        // Handle callbacks with type casting for our specific payload
        callbackHandler.on('callback', (data: CallbackEventData) => {

            // TODO: Handle the callback data here
            const queryParameters = data.queryParameters;
            const body: PaymentInstance = data.body;

            const callSid = body.callSid;
            const paymentSid = body.sid;

            // Store the result in the callbackData map
            this.statusCallbackData.set(paymentSid, body);

            // Now let the MCP server know
            this.emit('callback', { queryParameters, body });

        });
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
        // Create the payment session
        const sessionData = {
            idempotencyKey: callSid + Date.now().toString(),
            statusCallback: this.statusCallback,
            tokenType: this.tokenType,
            currency: this.currency,
            paymentConnector: this.paymentConnector,
            securityCode: true,
            postalCode: false
        }

        let paymentSession: PaymentInstance;
        // Now create the payment session
        try {
            paymentSession = await this.twilioClient.calls(callSid)
                .payments
                .create(sessionData);

            // store the data in the callbackData map, using the Sid as the key
            this.statusCallbackData.set(paymentSession.sid, paymentSession);

            // Return the Payment session Sid for this Call Sid
            return paymentSession;
        } catch (error) {
            const message = `Error with StartCapture for callSID: ${callSid} - ${error} `;
            this.emit('log', { level: 'error', message });
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
            const message = `startCapture error: Call not in progress for ${callSid}`;
            this.emit('log', { level: 'error', message });
            return null;
        }

        try {
            const paymentSession = await this.twilioClient
                .calls(callSid)
                .payments(paymentSid)
                .update({
                    capture: captureType,
                    idempotencyKey: callSid + Date.now().toString(),
                    statusCallback: this.statusCallback,
                });

            // Store the new data in the callbackData map, using the Sid as the key
            this.statusCallbackData.set(paymentSession.sid, paymentSession);

            return paymentSession; // Pay Object
        } catch (error) {
            const message = `Error with captureCard for callSID: ${callSid} - ${error} `;
            this.emit('log', { level: 'error', message });
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
            const paymentSession = await this.twilioClient
                .calls(callSid)
                .payments(paymentSid)
                .update({
                    idempotencyKey: callSid + Date.now().toString(),
                    status: "complete",
                    statusCallback: `${this.statusCallback}?lastCall=finishCapture`,
                });

            // Store the new data in the callbackData map, using the Sid as the key
            this.statusCallbackData.set(paymentSession.sid, paymentSession);

            return paymentSession;
        } catch (error) {
            const message = `Error with finishCapture for callSID: ${callSid} - ${error} `;
            this.emit('log', { level: 'error', message });
            return null;
        }
    }

    /**
     * Implement a status callback public endpoint to receive the status of the payment
     */


    /**
     * Processes a callback based on the last call
     * @param lastCall The last call parameter
     * @param body The callback body
     */
    getStatusCallbackData(paymentSid: string) {
        // Check if the paymentSid exists in the map
        if (this.statusCallbackData.has(paymentSid)) {
            // Based on this data we now need to work out what state we are in? Are we still collecting card, security or exp. date? This is the specific Twilio knowledge
            // TODO: This needs to be simplified for the MCP server
            /*
            The logic works as follows:
            1. Check the contents of "required" array. These are the items that are still to be collected
            2. Check "Capture" to see what we are currently capturing
            3. Check "PartialResult" to see if what we are currently "Capture"ing is still being captured.

            So here is what the process we need to go through. 
            When the customer wants to capture a card, we will start the process of capturing the card. 
                "Required": ["payment-card-number", "security-code", "expiration-date"]
                "Capture": "payment-card-number"
                "PartialResult": "true".
            So we are still capturing the card number.

            When the customer has entered the card number, we will then capture the security code.
                "Required": ["security-code", "expiration-date"]
                "Capture": "security-code"
                "PartialResult": "true".
            So we are still capturing the security code.
            When the customer has entered the security code, we will then capture the expiration date.
                "Required": ["expiration-date"]
                "Capture": "expiration-date"
                "PartialResult": "true".
            So we are not capturing the expiration date.


            */



            // Return the data associated with the paymentSid. Note this needs to be simplified for the MCP server
            const paymentData = this.statusCallbackData.get(paymentSid);
            const simplifiedData = {
                paymentSid: paymentSid,
                paymentCardNumber: paymentData.PaymentCardNumber,
                paymentCardType: paymentData.PaymentCardType,
                securityCode: paymentData.SecurityCode,
                expirationDate: paymentData.ExpirationDate,
                paymentConfirmationCode: paymentData.PaymentConfirmationCode,
                result: paymentData.Result,
                profileId: paymentData.ProfileId,
                paymentToken: paymentData.PaymentToken,
                paymentMethod: paymentData.PaymentMethod,
            };

            return simplifiedData;
        } else {
            // If not found, return null
            return null;
        }
    }
}

export { TwilioAgentPaymentServer };
