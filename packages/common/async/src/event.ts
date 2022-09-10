//
// Copyright 2020 DXOS.org
//

import { throwUnhandledRejection } from '@dxos/debug';

export type Effect = () => (() => void) | undefined;

/**
 * Effect that's been added to a specific Event.
 */
interface MaterializedEffect {
  effect: Effect
  cleanup: (() => void) | undefined
}

interface EventEmitterLike {
  on(event: string, cb: (data: any) => void): void
  off(event: string, cb: (data: any) => void): void
}

/**
 * An EventEmitter variant that does not do event multiplexing and respresents a single event.
 *
 * ## Typical usage:
 * ```javascript
 * class Model {
 *   public readonly update = new Event<UpdateData>();
 *   private readonly privateEvent = new Event<void>();
 *
 *   onUpdate(data: UpdateData) {
 *     ...
 *     this.update.emit(data);
 *   }
 * }
 *
 *
 * model.update.on(data => {
 *   ...
 * });
 * ```
 *
 * ## Advantages over traditional EventEmitter:
 * 1. User describes explicitly what events a class has as they are defined as class fields.
 * 2. User can explicitly define event visibility (public, protected, private).
 * 3. Havings events as class fields allows the compiler to check for correct event usage.
 * 4. User can type the data that event will be emitting.
 * 5. Uses composition instead of inheritance.
 * 6. Removes the cases where event names intersect when used in cases with inheritance.
 * 7. Remove the need to namespace events when developing a class with events that will be used as a base-class.
 */
// TODO(burdon): Rename EventListener.
export class Event<T = void> implements ReadOnlyEvent<T> {
  static wrap<T> (emitter: EventEmitterLike, eventName: string): Event<T> {
    const event = new Event<T>();

    event.addEffect(() => {
      const onEvent = (data: any) => event.emit(data);
      emitter.on(eventName, onEvent);
      return () => emitter.off(eventName, onEvent);
    });

    return event;
  }

  private readonly _listeners = new Set<(data: T) => void>();
  private readonly _onceListeners = new Set<(data: T) => void>();
  private readonly _effects = new Set<MaterializedEffect>();

  /**
   * Emit an event.
   *
   * In most cases should only be called by the class or enitity containing the event.
   *
   * All listeners are called in order of subscription with presistent ones first.
   * Calls are performed asynchronously through `setImmeidate` callback.
   *
   * @param data param that will be passed to all listeners.
   */
  emit (data: T) {
    for (const listener of this._listeners) {
      void this._trigger(listener, data);
    }

    for (const listener of this._onceListeners) {
      void this._trigger(listener, data);
      this._onceListeners.delete(listener);
    }
  }

  /**
   * Register an event listener.
   *
   * If provided callback was already registered as once-listener, it is made permanent.
   *
   * @param callback
   * @returns function that unsubscribes this event listener
   */
  on (callback: (data: T) => void): () => void {
    if (this._onceListeners.has(callback)) {
      this._onceListeners.delete(callback);
    }

    this._listeners.add(callback);

    if (this.listenerCount() === 1) {
      this._runEffects();
    }

    return () => this.off(callback);
  }

  /**
   * Unsubscribe this callback from new events. Inncludes persistent and once-listeners.
   *
   * NOTE: It is recomended to use `Event.on`'s return value instead.
   *
   * If the callback is not subscribed this is no-op.
   *
   * @param callback
   */
  off (callback: (data: T) => void) {
    this._listeners.delete(callback);
    this._onceListeners.delete(callback);

    if (this.listenerCount() === 0) {
      this._cleanupEffects();
    }
  }

  /**
   * Register a callback to be called only once when the next event is emitted.
   *
   * If this callback is already registered as permanent listener, this is no-op.
   *
   * @param callback
   */
  once (callback: (data: T) => void): () => void {
    if (this._listeners.has(callback)) {
      return () => { /* No-op. */ };
    }

    this._onceListeners.add(callback);
    if (this.listenerCount() === 1) {
      this._runEffects();
    }

    return () => {
      this._onceListeners.delete(callback);
      if (this.listenerCount() === 0) {
        this._runEffects();
      }
    };
  }

  /**
   * An async iterator that iterates over events.
   *
   * This iterator runs indefinitely.
   */
  async * [Symbol.asyncIterator] (): AsyncIterator<T> {
    while (true) {
      yield await new Promise(resolve => {
        this.once(resolve);
      });
    }
  }

  /**
   * Returns a promise that resolves with the first event emitted that matches the provided predicate.
   *
   * @param predicate
   */
  waitFor (predicate: (data: T) => boolean): Promise<T> {
    return new Promise((resolve) => {
      const unsubscribe = this.on(data => {
        if (predicate(data)) {
          unsubscribe();
          resolve(data);
        }
      });
    });
  }

  /**
   * Returns a promise that resolves once a specific number of events was emitted since this method was called.
   * @param expectedCount
   */
  waitForCount (expectedCount: number): Promise<T> {
    let count = 0;
    return this.waitFor(() => ++count === expectedCount);
  }

  /**
   * Similar to waitFor, but the promise resolves immediatelly if the condition is already true.
   */
  async waitForCondition (predicate: () => boolean): Promise<void> {
    if (!predicate()) {
      await this.waitFor(predicate);
    }
  }

  /**
   * Returns the number of persistent listeners.
   */
  listenerCount () {
    return this._listeners.size + this._onceListeners.size;
  }

  /**
   * Add a side effect that will be activated once the event has at least one subscriber.
   * The provided callback can return a function that will be used to clean up after the last subscriber unsubscribes from the event.
   * The API is similar to `useEffect` from React.
   *
   * ## Example:
   * ```typescript
   * event.addEffect(() => {
   *   // do stuff
   *   return () => {
   *     // clean-up
   *   };
   * });
   * ```
   *
   * @returns Callback that will remove this effect once called.
   */
  addEffect (effect: Effect): () => void {
    const handle: MaterializedEffect = { effect, cleanup: undefined };

    if (this.listenerCount() > 0) {
      handle.cleanup = handle.effect();
    }

    this._effects.add(handle);
    return () => {
      // eslint-disable-next-line no-unused-expressions
      handle.cleanup?.();
      this._effects.delete(handle);
    };
  }

  debounce (timeout = 0) {
    const debouncedEvent = new Event<void>();

    let firing = false;

    debouncedEvent.addEffect(() => this.on(() => {
      if (!firing) {
        firing = true;
        setTimeout(() => {
          firing = false;
          debouncedEvent.emit();
        }, timeout);
      }
    }));

    return debouncedEvent;
  }

  /**
   * Turn any variant of `Event<T>` into an `Event<void>` discarding the callback parameter.
   */
  discardParameter (): Event<void> {
    return this as any;
  }

  /**
   * Overriden to not retun implementation details.
   */
  toJSON () {
    return {
      listenerCount: this.listenerCount()
    };
  }

  private async _trigger (listener: (data: T) => void, data: T) {
    try {
      await waitImmediate(); // Acts like setImmediate but preserves the stack-trace.
      listener(data);
    } catch (err: any) {
      // Stop error propagation.
      throwUnhandledRejection(err);
    }
  }

  private _runEffects () {
    for (const handle of this._effects) {
      handle.cleanup = handle.effect();
    }
  }

  private _cleanupEffects () {
    for (const handle of this._effects) {
      // eslint-disable-next-line no-unused-expressions
      handle.cleanup?.();
      handle.cleanup = undefined;
    }
  }
}

/**
 * A version of Event class which only has subscribe methods.
 *
 * Usefull in cases where you want to explicitly prohibit calling `emit` method.
 */
export interface ReadOnlyEvent<T = void> {
  /**
   * Register an event listener.
   *
   * If provided callback was already registered as once-listener, it is made permanent.
   *
   * @param callback
   * @returns function that unsubscribes this event listener
   */
  on(callback: (data: T) => void): () => void

  /**
   * Unsubscribe this callback from new events. Inncludes persistent and once-listeners.
   *
   * NOTE: It is recomended to us `Event.on`'s return value.
   *
   * If the callback is not subscribed this is no-op.
   *
   * @param callback
   */
  off(callback: (data: T) => void): void

  /**
   * Register a callback to be called only once when the next event is emitted.
   *
   * If this callback is already registered as permanent listener, this is no-op.
   *
   * @param callback
   */
  once(callback: (data: T) => void): () => void

  /**
   * An async iterator that iterates over events.
   *
   * This iterator runs indefinitely.
   */
  [Symbol.asyncIterator](): AsyncIterator<T>

  /**
   * Returns a promise that resolves with the first event emitted that matches the provided predicate.
   *
   * @param predicate
   */
  waitFor(predicate: (data: T) => boolean): Promise<T>

  /**
   * Returns a promise that resolves once a specific number of events was emitted since this method was called.
   * @param expectedCount
   */
  waitForCount(expectedCount: number): Promise<T>

  /**
   * Turn any variant of `Event<T>` into an `Event<void>` discarding the callback parameter.
   */
  discardParameter(): Event<void>
}

/**
 * Like setImmediate but for async/await API. Useful for preserving stack-traces.
 */
const waitImmediate = () => new Promise((resolve) => setImmediate(resolve));
