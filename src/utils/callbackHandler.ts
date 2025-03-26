import express from 'express';
import { EventEmitter } from 'events';
import { paymentStateStore } from './paymentStateStore.js';
import { PaymentCapture } from 'twilio/lib/rest/api/v2010/account/call/payment.js';

/**
 * Callback handler for Twilio payment callbacks
 * Extends EventEmitter to emit events that can be consumed by the main application
 */
class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private port: number;
    private server: any;

    constructor(port: number = 4000) {
        super();
        this.port = port;
        this.app = express();

        // Configure Express
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Set up routes
        this.setupRoutes();
    }

    /**
     * Starts the callback server
     */
    start(): void {
        this.server = this.app.listen(this.port, () => {
            const message = `Callback server listening on port ${this.port}`;
            this.emit('log', { level: 'info', message });
        });
    }

    /**
     * Stops the callback server
     */
    stop(): void {
        if (this.server) {
            this.server.close();
            const message = 'Callback server stopped';
            this.emit('log', { level: 'info', message });
        }
    }

    /**
     * Sets up the Express routes
     */
    private setupRoutes(): void {
        // Main callback endpoint
        this.app.post('/', (req, res) => {
            try {
                const lastCall = req.query.lastCall as string;
                const callSid = req.body.CallSid;
                const paymentSid = req.body.PaymentSid;


                // Process the callback based on the last call
                this.processCallback(lastCall, req.body);

                // Send a success response
                res.status(200).send('OK');
            } catch (error) {
                const message = `Error processing callback: ${error}`;
                this.emit('log', { level: 'error', message });
                res.status(500).send('Error processing callback');
            }
        });
    }

    /**
     * Processes a callback based on the last call
     * @param lastCall The last call parameter
     * @param body The callback body
     */
    private processCallback(lastCall: string, body: any): void {
        const callSid = body.CallSid;
        const paymentSid = body.PaymentSid;

        // Handle different callback types
        switch (lastCall) {
            case 'startCapture':
                this.handleStartCaptureCallback(callSid, paymentSid, body);
                break;
            case 'payment-card-number':
                this.handleCardNumberCallback(callSid, paymentSid, body);
                break;
            case 'security-code':
                this.handleSecurityCodeCallback(callSid, paymentSid, body);
                break;
            case 'expiration-date':
                this.handleExpirationDateCallback(callSid, paymentSid, body);
                break;
            case 'finishCapture':
                this.handleFinishCaptureCallback(callSid, paymentSid, body);
                break;
            default:
                const message = `Unknown callback type: ${lastCall}`;
                this.emit('log', { level: 'error', message });
        }
    }

    /**
     * Handles a start capture callback
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param body The callback body
     */
    private handleStartCaptureCallback(callSid: string, paymentSid: string, body: any): void {
        // Create a new session
        paymentStateStore.createSession(callSid, paymentSid);

        // Update the session status
        paymentStateStore.updateSessionStatus(callSid, paymentSid, 'in-progress');

    }

    /**
     * Handles a card number callback
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param body The callback body
     */
    private handleCardNumberCallback(callSid: string, paymentSid: string, body: any): void {
        const session = paymentStateStore.getSession(callSid, paymentSid);

        if (!session) {
            const message = `Session not found for call ${callSid}, payment ${paymentSid}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Check for errors
        if (body.Result === 'error') {
            paymentStateStore.updateFieldState(callSid, paymentSid, 'cardNumber', {
                needsReentry: true,
                reentryReason: body.ErrorMessage || 'Error capturing card number',
                attempts: session.cardNumber.attempts + 1
            });

            const message = `Error capturing card number: ${body.ErrorMessage}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Update the card number field
        paymentStateStore.updateFieldState(callSid, paymentSid, 'cardNumber', {
            masked: body.PaymentCardNumber || '•••• •••• •••• ••••',
            complete: true,
            needsReentry: false,
            reentryReason: null
        });

    }

    /**
     * Handles a security code callback
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param body The callback body
     */
    private handleSecurityCodeCallback(callSid: string, paymentSid: string, body: any): void {
        const session = paymentStateStore.getSession(callSid, paymentSid);

        if (!session) {
            const message = `Session not found for call ${callSid}, payment ${paymentSid}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Check for errors
        if (body.Result === 'error') {
            paymentStateStore.updateFieldState(callSid, paymentSid, 'securityCode', {
                needsReentry: true,
                reentryReason: body.ErrorMessage || 'Error capturing security code',
                attempts: session.securityCode.attempts + 1
            });

            const message = `Error capturing security code: ${body.ErrorMessage}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Update the security code field
        paymentStateStore.updateFieldState(callSid, paymentSid, 'securityCode', {
            masked: body.PaymentSecurityCode || '•••',
            complete: true,
            needsReentry: false,
            reentryReason: null
        });

    }

    /**
     * Handles an expiration date callback
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param body The callback body
     */
    private handleExpirationDateCallback(callSid: string, paymentSid: string, body: any): void {
        const session = paymentStateStore.getSession(callSid, paymentSid);

        if (!session) {
            const message = `Session not found for call ${callSid}, payment ${paymentSid}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Check for errors
        if (body.Result === 'error') {
            paymentStateStore.updateFieldState(callSid, paymentSid, 'expirationDate', {
                needsReentry: true,
                reentryReason: body.ErrorMessage || 'Error capturing expiration date',
                attempts: session.expirationDate.attempts + 1
            });

            const message = `Error capturing expiration date: ${body.ErrorMessage}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Update the expiration date field
        paymentStateStore.updateFieldState(callSid, paymentSid, 'expirationDate', {
            masked: body.PaymentExpirationDate || '••/••',
            complete: true,
            needsReentry: false,
            reentryReason: null
        });

    }

    /**
     * Handles a finish capture callback
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param body The callback body
     */
    private handleFinishCaptureCallback(callSid: string, paymentSid: string, body: any): void {
        // Check for errors
        if (body.Result === 'error') {
            paymentStateStore.updateSessionStatus(
                callSid,
                paymentSid,
                'error',
                body.ErrorMessage || 'Error completing payment capture'
            );

            const message = `Error completing payment capture: ${body.ErrorMessage}`;
            this.emit('log', { level: 'error', message });
            return;
        }

        // Set the payment token
        paymentStateStore.setPaymentToken(callSid, paymentSid, body.PaymentToken || '');

    }

    /**
     * Maps a capture type to a field name
     * @param captureType The capture type
     * @returns The field name
     */
    private mapCaptureTypeToField(captureType: PaymentCapture): 'cardNumber' | 'securityCode' | 'expirationDate' {
        switch (captureType) {
            case 'payment-card-number':
                return 'cardNumber';
            case 'security-code':
                return 'securityCode';
            case 'expiration-date':
                return 'expirationDate';
            default:
                throw new Error(`Unknown capture type: ${captureType}`);
        }
    }
}

// Export a singleton instance
export const callbackHandler = new CallbackHandler();
