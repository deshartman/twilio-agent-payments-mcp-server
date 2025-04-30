/* NOTE: The Twilio package is a CommonJS module, but we're using ES modules (type: "module" in package.json).
 When importing a CommonJS module in an ES module context, we can't use named imports directly.
 Instead, we import the entire module as a default import and then extract the named exports.
 */
import pkg from 'twilio';
const { Twilio } = pkg;
import { EventEmitter } from 'events';
import { PaymentCapture, PaymentInstance, PaymentTokenType } from "twilio/lib/rest/api/v2010/account/call/payment.js";
import { LOG_EVENT, CALLBACK_EVENT } from '../constants/events.js';

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
    TunnelStatusEventData,
    CallbackHandlerEvents,
    CallbackHandlerEventNames
} from '@deshartman/mcp-status-callback';

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
 * NOTE: When handling Twilio calls, you need to understand which call leg Call SID you are working with. Twilio Payments need to be
 * attached to the PSTN side call leg. If applied to the Twilio Client side, the DTMF digits will not be captured. As such this class
 * assumes the correct call leg is being used. Typically it is checked as below:
 * 
 *  // Direction of the call
 * let PSTNSideCallSid
 *   if (event.CallDirection === "toPSTN") {
 *     PSTNSideCallSid = event.CallSid;
 *   }
 * 
 *   if (event.CallDirection == "toSIP") {// toSIP
 *     PSTNSideCallSid = event.ParentCallSid;
 *   }
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
    private callbackHandler: CallbackHandler | null = null;
    private statusCallbackUrl: string | null = null; // The URL to send the status callback to
    // A callback Map to hold the status callback data. The key is they payment SID and the data is JSON of any type
    statusCallbackMap: Map<string, any>;

    tokenType: PaymentTokenType; // Always tokenise the card
    currency: string;
    paymentConnector: string;

    constructor(accountSid: string, apiKey: string, apiSecret: string) {
        super();
        this.accountSid = accountSid;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.tokenType = process.env.TOKEN_TYPE as PaymentTokenType;
        this.currency = process.env.CURRENCY as string;
        this.paymentConnector = process.env.PAYMENT_CONNECTOR as string;

        // Initialize the Twilio client with the provided credentials
        this.twilioClient = new Twilio(apiKey, apiSecret, { accountSid: accountSid });

        // Keep a map of all the status callback data
        this.statusCallbackMap = new Map<string, any>();
        //this.statusCallbackMap = new Map();

        /*********************************************** *
         * 
         *       MCP Status Callback
         * 
         * *********************************************** */
        // Initialize the status callback handler using environment variables
        const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
        const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

        if (!ngrokAuthToken) {
            // Emit the error event and exit the process
            this.emit(LOG_EVENT, { level: 'error', message: 'NGROK_AUTH_TOKEN environment variable not provided. Callback server will not be started.' });
            process.exit(1);
        }

        const options: CallbackHandlerOptions = {
            ngrokAuthToken,
            customDomain
        };

        this.callbackHandler = new CallbackHandler(options);

        // Set up event listeners with proper typing
        this.callbackHandler.on(CallbackHandlerEventNames.LOG, (logData: LogEventData) => {
            this.emit(LOG_EVENT, { level: logData.level, message: logData.message });
        });

        // Handle callbacks with type casting for our specific payload
        this.callbackHandler.on(CallbackHandlerEventNames.CALLBACK, (callbackData: CallbackEventData) => {
            // this.emit(LOG_EVENT, { level: 'info', message: `Constructor Received CALLBACK: ${JSON.stringify(callbackData)}` });

            const queryParameters: any = callbackData.queryParameters;
            const body: any = callbackData.body;
            const callSid: string = body.CallSid;
            const paymentSid: string = body.Sid;

            // Store the result in the callbackData map
            this.statusCallbackMap.set(paymentSid, body);

            // Now let the MCP server know
            this.emit(CALLBACK_EVENT, { level: 'info', message: `CALLBACK Body: ${JSON.stringify(body)}` });
        });

        // Start the callback server
        try {
            this.startCallbackServer();
            // this.emit(LOG_EVENT, { level: 'info', message: 'Callback server started successfully.' });
        } catch (error) {
            this.emit(LOG_EVENT, { level: 'error', message: `Failed to start MCP status callback server: ${error}` });
        }
    }

    /**
     * Private method to start the callback server
     * @returns {Promise<void>}
     */
    private async startCallbackServer(): Promise<void> {
        if (!this.callbackHandler) {
            this.emit(LOG_EVENT, { level: 'error', message: 'Callback handler is not initialized.' });
            throw new Error('Callback handler not initialized');
        }

        try {
            this.statusCallbackUrl = await this.callbackHandler.start();
            // this.emit(LOG_EVENT, { level: 'info', message: `Callback server started at: ${this.statusCallbackUrl}` });
        } catch (error) {
            this.emit(LOG_EVENT, { level: 'error', message: `Error starting callback server: ${error}` });
            throw error;
        }
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
            statusCallback: this.statusCallbackUrl,
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
            this.statusCallbackMap.set(paymentSession.sid, paymentSession);

            // Emit a log event for starting the capture
            this.emit(LOG_EVENT, { level: 'info', message: `Started payment SID: ${paymentSession.sid} this.StatusCallbackMap: ${JSON.stringify(this.statusCallbackMap.get(paymentSession.sid), null, 2)}` });

            // Return the Payment session Sid for this Call Sid
            return paymentSession;
        } catch (error) {
            const message = `Error with StartCapture for callSID: ${callSid} - ${error} `;
            this.emit(LOG_EVENT, { level: 'error', message });
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
            this.emit(LOG_EVENT, { level: 'error', message: `Call SID: ${callSid} is not in progress. Cannot update payment session.` });
            return null;
        }

        // Log that updatePaySession is being called and has a this.statusCallbackUrl value of
        this.emit(LOG_EVENT, { level: 'info', message: `updatePaySession called with callSID: ${callSid} - Payment SID: ${paymentSid} - Capture Type: ${captureType} - this.statusCallbackUrl: ${this.statusCallbackUrl}` });

        try {
            const paymentSession = await this.twilioClient
                .calls(callSid)
                .payments(paymentSid)
                .update({
                    capture: captureType,
                    idempotencyKey: callSid + Date.now().toString(),
                    statusCallback: this.statusCallbackUrl,
                });

            // Store the new data in the callbackData map, using the Sid as the key
            this.statusCallbackMap.set(paymentSid, paymentSession);

            return paymentSession; // Pay Object
        } catch (error) {
            const message = `Error with captureCard for callSID: ${callSid} - ${error} `;
            this.emit(LOG_EVENT, { level: 'error', message });
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
                    statusCallback: `${this.statusCallbackUrl}?lastCall=finishCapture`,
                });

            // Store the new data in the callbackData map, using the Sid as the key
            this.statusCallbackMap.set(paymentSid, paymentSession);

            return paymentSession;
        } catch (error) {
            const message = `Error with finishCapture for callSID: ${callSid} - ${error} `;
            this.emit(LOG_EVENT, { level: 'error', message });
            return null;
        }
    }

    /**
     * Processes a callback based on the last call
     * @param lastCall The last call parameter
     * @param body The callback body
     */
    getStatusCallbackData(paymentSid: string) {
        // Check if the paymentSid exists in the map
        if (this.statusCallbackMap.has(paymentSid)) {
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
            const paymentData = this.statusCallbackMap.get(paymentSid);

            // Emit a log event for the status callback
            // this.emit(LOG_EVENT, { level: 'debug', message: `getStatusCallbackData: Payment Data: ${JSON.stringify(paymentData)}` });
            const simplifiedData = {
                paymentSid: paymentSid,
                paymentCardNumber: paymentData.PaymentCardNumber || "",
                paymentCardType: paymentData.PaymentCardType || "",
                securityCode: paymentData.SecurityCode || "",
                expirationDate: paymentData.ExpirationDate || "",
                paymentConfirmationCode: paymentData.PaymentConfirmationCode || "",
                result: paymentData.Result || "",
                profileId: paymentData.ProfileId || "",
                paymentToken: paymentData.PaymentToken || "",
                paymentMethod: paymentData.PaymentMethod || "",
            };

            this.emit(LOG_EVENT, { level: 'info', message: `getStatusCallbackData.Simplified Data: ${JSON.stringify(simplifiedData)}` });
            return simplifiedData;
        } else {
            // If not found, return null
            return null;
        }
    }
}

export { TwilioAgentPaymentServer };
