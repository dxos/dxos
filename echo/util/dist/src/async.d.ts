import { EventEmitter } from 'events';
/**
 * Waits for the specified number of events from the given emitter.
 * @param emitter
 * @param event
 * @param count
 */
export declare const sink: (emitter: EventEmitter, event: string, count?: number) => Promise<unknown>;
export declare const latch: (n?: number) => readonly [Promise<number>, () => void];
export declare class Trigger {
    _promise: Promise<void>;
    _wake: () => void;
    constructor();
    wait(): Promise<void>;
    wake(): void;
    reset(): void;
}
//# sourceMappingURL=async.d.ts.map