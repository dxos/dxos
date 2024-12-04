import { type ReactiveHandler } from './types';
import { type BaseObject, type ReactiveObject } from '@dxos/echo-schema';
export declare const symbolIsProxy: unique symbol;
export declare const isReactiveObject: (value: unknown) => value is ReactiveObject<any>;
export declare const isValidProxyTarget: (value: any) => value is object;
/**
 * @deprecated
 */
export declare const getProxySlot: <T extends BaseObject<T>>(proxy: ReactiveObject<any>) => ProxyHandlerSlot<T>;
export declare const getProxyTarget: <T extends BaseObject<T>>(proxy: ReactiveObject<any>) => T;
export declare const getProxyHandler: <T extends BaseObject<T>>(proxy: ReactiveObject<any>) => ReactiveHandler<T>;
/**
 * Unsafe method to override id for debugging/testing and migration purposes.
 * @deprecated
 */
export declare const dangerouslySetProxyId: <T extends BaseObject<T>>(obj: ReactiveObject<T>, id: string) => void;
/**
 * Create a reactive proxy object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 *
 * @param target Object or array. Passing in array will enable array methods.
 * @param handler ReactiveHandler instance.
 */
export declare const createProxy: <T extends BaseObject<T>>(target: T, handler: ReactiveHandler<T>) => ReactiveObject<T>;
/**
 * Passed as the handler to the Proxy constructor.
 * Maintains a mutable slot for the actual handler.
 */
declare class ProxyHandlerSlot<T extends BaseObject<T>> implements ProxyHandler<T> {
    readonly target: T;
    private _handler;
    /**
     * @param target Original object.
     * @param _handler Handles intercepted operations.
     */
    constructor(target: T, _handler: ReactiveHandler<T>);
    get handler(): ReactiveHandler<T>;
    setHandler(handler: ReactiveHandler<T>): void;
    /**
     * Get value.
     */
    get(target: T, prop: string | symbol, receiver: any): any;
}
export {};
//# sourceMappingURL=proxy.d.ts.map