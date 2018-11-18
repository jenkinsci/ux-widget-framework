/**
 * Simple signals impl. 
 * 
 * TODO: We might want to use somebody else's, but they all seem a bit heavy-handed 
 * for our use case.
 */

/** 
 * Represents a subscription to a particular signal
 */
export interface Subscription {
    /**
     * Cancel the subscription, and remove any references to it so it can be collected
     */
    cancel(): void;

    /**
     * Sets this subscription to be single-use. Returns self for easy assignment.
     */
    once(): this;
}

/**
 * Basic event structure
 */
export interface HostEvent<T> {
    /**
     * A string identifier for the event/signal. 
     */
    readonly type: string;

    /**
     * Payload
     */
    readonly value: T;
}

/** 
 * Shorthand type of an event handler
 */
export type Handler<T> = (event: HostEvent<T>) => void;

/**
 * A Signal represents the events to the consumer
 */
export interface Signal<T> {
    /**
     * Provides value for EventValue.type
     */
    readonly type: string;

    /**
     * 
     * @param handler event handler function
     */
    add(handler: Handler<T>): Subscription;
}

/**
 * An Emitter represents the subscribers to the dispatcher
 */
export interface Emitter<T> {
    dispatch(value: T): void;
}

/**
 * Simple subscription implementation.
 * 
 * TODO: Tests!
 */
class BasicSubscription<T> implements Subscription {

    private unsubscribe: () => void;
    private handler: Handler<T>;
    private isSingleUse = false;

    constructor(unsubscribe: () => void, handler: Handler<T>) {
        this.unsubscribe = unsubscribe;
        this.handler = handler;
    }

    cancel() {
        this.unsubscribe();
    }

    once(): this {
        this.isSingleUse = true;
        return this;
    }

    /**
     * Called by EventSource, not application code
     */
    _forward(event: HostEvent<T>) {
        try {
            (this.handler)(event);
        }
        finally {
            if (this.isSingleUse) {
                this.cancel();
            }
        }
    }
}

/**
 * Simple Emitter/Signal implementation. 
 * 
 * TODO: Needs tests, obvs.
 */
export class EventSource<T> implements Emitter<T>, Signal<T> {

    readonly type: string;

    private subscriptions: Array<BasicSubscription<T>> = [];

    constructor(type: string) {
        this.type = type;
    }

    // For emitter
    dispatch(value: T) {

        const event = {
            type: this.type,
            value
        };

        for (const sub of this.subscriptions) {
            try {
                sub._forward(event);
            } catch (e) {
                console.error('EventSource: Error on dispatch', e);
            }
        }
    }

    // For subscriber
    add(handler: Handler<T>): Subscription {

        const unsubscribe = () => {
            const idx = this.subscriptions.indexOf(sub);
            if (idx !== -1) {
                this.subscriptions.splice(idx, 1);
            }
        };

        let sub = new BasicSubscription(unsubscribe, handler);
        this.subscriptions.push(sub);
        return sub;
    }
}
