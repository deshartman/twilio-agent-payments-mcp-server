
/**
 * Represents the state of a payment field
 */
export interface PaymentFieldState {
    masked: string;
    complete: boolean;
    needsReentry: boolean;
    reentryReason: string | null;
    attempts: number;
}

/**
 * Represents the state of a payment session
 */
export interface PaymentSessionState {
    callSid: string;
    paymentSid: string;
    status: 'initialized' | 'in-progress' | 'complete' | 'error';
    errorMessage?: string;
    cardNumber: PaymentFieldState;
    securityCode: PaymentFieldState;
    expirationDate: PaymentFieldState;
    token?: string;
    lastUpdated: Date;
}

/**
 * In-memory store for payment session states
 */
class PaymentStateStore {
    private sessions: Map<string, PaymentSessionState>;

    constructor() {
        this.sessions = new Map();
    }

    /**
     * Creates a new payment session
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @returns The created session state
     */
    createSession(callSid: string, paymentSid: string): PaymentSessionState {
        const sessionKey = this.getSessionKey(callSid, paymentSid);

        // Create empty field states
        const emptyFieldState: PaymentFieldState = {
            masked: '',
            complete: false,
            needsReentry: false,
            reentryReason: null,
            attempts: 0
        };

        // Create the session state
        const sessionState: PaymentSessionState = {
            callSid,
            paymentSid,
            status: 'initialized',
            cardNumber: { ...emptyFieldState },
            securityCode: { ...emptyFieldState },
            expirationDate: { ...emptyFieldState },
            lastUpdated: new Date()
        };

        // Store the session
        this.sessions.set(sessionKey, sessionState);

        return sessionState;
    }

    /**
     * Gets a payment session by call SID and payment SID
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @returns The session state or undefined if not found
     */
    getSession(callSid: string, paymentSid: string): PaymentSessionState | undefined {
        const sessionKey = this.getSessionKey(callSid, paymentSid);
        return this.sessions.get(sessionKey);
    }

    /**
     * Updates a payment field state
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param field The field to update ('cardNumber', 'securityCode', or 'expirationDate')
     * @param update The partial update to apply
     * @returns The updated session state or undefined if not found
     */
    updateFieldState(
        callSid: string,
        paymentSid: string,
        field: 'cardNumber' | 'securityCode' | 'expirationDate',
        update: Partial<PaymentFieldState>
    ): PaymentSessionState | undefined {
        const sessionKey = this.getSessionKey(callSid, paymentSid);
        const session = this.sessions.get(sessionKey);

        if (!session) {
            console.error(`Session not found for call ${callSid}, payment ${paymentSid}`);
            return undefined;
        }

        // Update the field
        session[field] = {
            ...session[field],
            ...update
        };

        // Update the last updated timestamp
        session.lastUpdated = new Date();

        // Update the session in the store
        this.sessions.set(sessionKey, session);

        return session;
    }

    /**
     * Updates a payment session status
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param status The new status
     * @param errorMessage Optional error message
     * @returns The updated session state or undefined if not found
     */
    updateSessionStatus(
        callSid: string,
        paymentSid: string,
        status: PaymentSessionState['status'],
        errorMessage?: string
    ): PaymentSessionState | undefined {
        const sessionKey = this.getSessionKey(callSid, paymentSid);
        const session = this.sessions.get(sessionKey);

        if (!session) {
            console.error(`Session not found for call ${callSid}, payment ${paymentSid}`);
            return undefined;
        }

        // Update the status
        session.status = status;

        // Set error message if provided
        if (errorMessage) {
            session.errorMessage = errorMessage;
        }

        // Update the last updated timestamp
        session.lastUpdated = new Date();

        // Update the session in the store
        this.sessions.set(sessionKey, session);

        return session;
    }

    /**
     * Sets the payment token for a completed session
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param token The payment token
     * @returns The updated session state or undefined if not found
     */
    setPaymentToken(callSid: string, paymentSid: string, token: string): PaymentSessionState | undefined {
        const sessionKey = this.getSessionKey(callSid, paymentSid);
        const session = this.sessions.get(sessionKey);

        if (!session) {
            console.error(`Session not found for call ${callSid}, payment ${paymentSid}`);
            return undefined;
        }

        // Set the token
        session.token = token;

        // Update the status
        session.status = 'complete';

        // Update the last updated timestamp
        session.lastUpdated = new Date();

        // Update the session in the store
        this.sessions.set(sessionKey, session);

        return session;
    }

    /**
     * Resets a payment field for re-entry
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @param field The field to reset ('cardNumber', 'securityCode', or 'expirationDate')
     * @returns The updated session state or undefined if not found
     */
    resetField(
        callSid: string,
        paymentSid: string,
        field: 'cardNumber' | 'securityCode' | 'expirationDate'
    ): PaymentSessionState | undefined {
        const sessionKey = this.getSessionKey(callSid, paymentSid);
        const session = this.sessions.get(sessionKey);

        if (!session) {
            console.error(`Session not found for call ${callSid}, payment ${paymentSid}`);
            return undefined;
        }

        // Get the current attempts
        const currentAttempts = session[field].attempts;

        // Reset the field but increment the attempts
        session[field] = {
            masked: '',
            complete: false,
            needsReentry: false,
            reentryReason: null,
            attempts: currentAttempts + 1
        };

        // Update the last updated timestamp
        session.lastUpdated = new Date();

        // Update the session in the store
        this.sessions.set(sessionKey, session);

        return session;
    }

    /**
     * Gets a unique key for a session
     * @param callSid The call SID
     * @param paymentSid The payment SID
     * @returns The session key
     */
    private getSessionKey(callSid: string, paymentSid: string): string {
        return `${callSid}:${paymentSid}`;
    }
}

// Export a singleton instance
export const paymentStateStore = new PaymentStateStore();
