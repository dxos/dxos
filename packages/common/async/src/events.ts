//
// Copyright 2020 DXOS.org
//

import { Context } from '@dxos/context';
import { type MaybePromise } from '@dxos/util';

import { type CleanupFn } from './cleanup';

export type Effect = () => CleanupFn | undefined;

/**
 * Effect that's been added to a specific Event.
 */
interface MaterializedEffect {
  effect: Effect;
  cleanup: CleanupFn | undefined;
}

interface EventEmitterLike {
  on(event: string, cb: (data?: any) => void): void;
  off(event: string, cb: (data?: any) => void): void;
}

export type ListenerOptions = {
  weak?: boolean;
  once?: boolean;
};

type EventCallback<T> = (data: T) => MaybePromise<void>;

// TODO(dmaretskyi): Remove this once the code is cleaned up.
const DO_NOT_ERROR_ON_ASYNC_CALLBACK = true;

/**
 * An EventEmitter variant that does not do event multiplexing and represents a single event.
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
 * model.update.on(data => {
 *   ...
 * });
 * ```
 *
 * ## Advantages over traditional EventEmitter:
 * 1. User describes explicitly what events a class has as they are defined as class fields.
 * 2. User can explicitly define event visibility (public, protected, private).
 * 3. Having events as class fields allows the compiler to check for correct event usage.
 * 4. User can type the data that event will be emitting.
 * 5. Uses composition instead of inheritance.
 * 6. Removes the cases where event names intersect when used in cases with inheritance.
 * 7. Remove the need to namespace events when developing a class with events that will be used as a base-class.
 */
// TODO(burdon): Rename EventSink? (Event is a built-in type).
export class Event<T = void> implements ReadOnlyEvent<T> {
  /**
   * Wrap objects that have on/off style event emitters.
   */
  static wrap<T>(emitter: EventEmitterLike, eventName: string): Event<T> {
    const event = new Event<T>();

    event.addEffect(() => {
      const onEvent = (data: any) => event.emit(data);
      emitter.on(eventName, onEvent);
      return () => emitter.off(eventName, onEvent);
    });

    return event;
  }

  private readonly _listeners = new Set<EventListener<T>>();
  private readonly _effects = new Set<MaterializedEffect>();

  /**
   * Emit an event.
   * In most cases should only be called by the class or entity containing the event.
   * All listeners are called in order of subscription with persistent ones first.
   * Listeners are called synchronously in the same stack.
   * A thrown exception in the listener will stop the event from being emitted to the rest of the listeners.
   *
   * @param data param that will be passed to all listeners.
   */
  emit(data: T): void {
    for (const listener of this._listeners) {
      listener.trigger(data);

      if (listener.once) {
        this._listeners.delete(listener);
      }
    }
  }

  /**
   * Emit an event and wait for async listeners to complete.
   * In most cases should only be called by the class or entity containing the event.
   * All listeners are called in order of subscription with persistent ones first.
   * Listeners are called sequentially.
   *
   * @param data param that will be passed to all listeners.
   */
  async emitAsync(data: T): Promise<void> {
    for (const listener of this._listeners) {
      await listener.triggerAsync(data);

      if (listener.once) {
        this._listeners.delete(listener);
      }
    }
  }

  /**
   * Register an event listener.
   * If provided callback was already registered as once-listener, it is made permanent.
   *
   * @param callback
   * @param options.weak If true, the callback will be weakly referenced and will be garbage collected if no other references to it exist.
   * @returns function that unsubscribes this event listener
   */
  on(callback: EventCallback<T>): CleanupFn;
  on(ctx: Context, callback: EventCallback<T>, options?: ListenerOptions): CleanupFn;
  on(_ctx: any, _callback?: EventCallback<T>, options?: ListenerOptions): CleanupFn {
    const [ctx, callback] = _ctx instanceof Context ? [_ctx, _callback] : [new Context(), _ctx];
    const weak = !!options?.weak;
    const once = !!options?.once;

    const listener = new EventListener(this, callback, ctx, once, weak);

    this._addListener(listener);

    return () => {
      this._removeListener(listener);
    };
  }

  /**
   * Unsubscribe this callback from new events. Includes persistent and once-listeners.
   * NOTE: It is recommended to use `Event.on`'s return value instead.
   * If the callback is not subscribed this is no-op.
   *
   * @param callback
   */
  off(callback: (data: T) => void): void {
    for (const listener of this._listeners) {
      if (listener.derefCallback() === callback) {
        this._removeListener(listener);
      }
    }
  }

  /**
   * Register a callback to be called only once when the next event is emitted.
   * If this callback is already registered as permanent listener, this is no-op.
   *
   * @param callback
   */
  once(callback: (data: T) => void): CleanupFn;
  once(ctx: Context, callback: (data: T) => void): CleanupFn;
  once(_ctx: any, _callback?: (data: T) => void): CleanupFn {
    const [ctx, callback] = _ctx instanceof Context ? [_ctx, _callback] : [new Context(), _ctx];

    const listener = new EventListener(this, callback, ctx, true, false);

    this._addListener(listener);

    return () => {
      this._removeListener(listener);
    };
  }

  /**
   * An async iterator that iterates over events.
   * This iterator runs indefinitely.
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      yield await new Promise((resolve) => {
        this.once(resolve);
      });
    }
  }

  /**
   * Returns a promise that resolves with the first event emitted that matches the provided predicate.
   *
   * @param predicate
   */
  waitFor(predicate: (data: T) => boolean): Promise<T> {
    return new Promise((resolve) => {
      const unsubscribe = this.on((data) => {
        if (predicate(data)) {
          unsubscribe();
          resolve(data);
        }
      });
    });
  }

  /**
   * Returns a promise that resolves once a specific number of events was emitted since this method was called.
   *
   * @param expectedCount
   */
  waitForCount(expectedCount: number): Promise<T> {
    let count = 0;
    return this.waitFor(() => ++count === expectedCount);
  }

  /**
   * Similar to waitFor, but the promise resolves immediately if the condition is already true.
   */
  // TODO(burdon): Should pass event property to predicate.
  async waitForCondition(predicate: () => boolean): Promise<void> {
    if (!predicate()) {
      await this.waitFor(predicate);
    }
  }

  /**
   * Returns the number of persistent listeners.
   */
  listenerCount(): number {
    return this._listeners.size;
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
  addEffect(effect: Effect): CleanupFn {
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

  /**
   * Triggers an event with at least `timeout` milliseconds between each event.
   * If the event is triggered more often, the event is delayed until the timeout is reached.
   * If event is emitted for the first time or event wasn't fired for `timeout` milliseconds,
   * the event is emitted after `timeout / 8` ms.
   */
  // TODO(burdon): Factor out generic function.
  debounce(timeout = 0): Event<void> {
    let firing: NodeJS.Timeout | undefined;
    let lastFired: number | undefined;

    const debouncedEvent = new Event<void>();
    debouncedEvent.addEffect(() => {
      const unsubscribe = this.on(() => {
        if (!firing) {
          const fireIn = !lastFired || Date.now() - lastFired > timeout ? timeout / 8 : timeout;
          firing = setTimeout(() => {
            lastFired = Date.now();
            firing = undefined;
            debouncedEvent.emit();
          }, fireIn);
        }
      });

      return () => {
        unsubscribe();
        clearTimeout(firing);
      };
    });

    return debouncedEvent;
  }

  /**
   * Turn any variant of `Event<T>` into an `Event<void>` discarding the callback parameter.
   */
  discardParameter(): Event<void> {
    return this as any;
  }

  /**
   * Pipe the events into another event.
   * @param event
   */
  pipeInto(event: Event<T>): CleanupFn {
    return this.on((data) => event.emit(data));
  }

  /**
   * Overridden to not return implementation details.
   */
  toJSON(): { listenerCount: number } {
    return {
      listenerCount: this.listenerCount(),
    };
  }

  private _addListener(listener: EventListener<T>): void {
    this._listeners.add(listener);

    if (this.listenerCount() === 1) {
      this._runEffects();
    }
  }

  /**
   * @internal
   */
  _removeListener(listener: EventListener<T>): void {
    this._listeners.delete(listener);
    listener.remove();

    if (this.listenerCount() === 0) {
      this._cleanupEffects();
    }
  }

  private _runEffects(): void {
    for (const handle of this._effects) {
      handle.cleanup = handle.effect();
    }
  }

  private _cleanupEffects(): void {
    for (const handle of this._effects) {
      // eslint-disable-next-line no-unused-expressions
      handle.cleanup?.();
      handle.cleanup = undefined;
    }
  }
}

/**
 * A version of Event class which only has subscribe methods.
 * Useful in cases where you want to explicitly prohibit calling `emit` method.
 */
export interface ReadOnlyEvent<T = void> {
  /**
   * Register an event listener.
   * If provided callback was already registered as once-listener, it is made permanent.
   *
   * @param callback
   * @param options.weak If true, the callback will be weakly referenced and will be garbage collected if no other references to it exist.
   * @returns function that unsubscribes this event listener
   */
  on(callback: (data: T) => void): CleanupFn;
  on(ctx: Context, callback: (data: T) => void, options?: ListenerOptions): CleanupFn;

  /**
   * Unsubscribes this callback from new events. Includes persistent and once-listeners.
   * NOTE: It is recommended to us `Event.on`'s return value.
   * If the callback is not subscribed this is no-op.
   *
   * @param callback
   */
  off(callback: (data: T) => void): void;

  /**
   * Register a callback to be called only once when the next event is emitted.
   * If this callback is already registered as permanent listener, this is no-op.
   *
   * @param callback
   */
  once(callback: (data: T) => void): CleanupFn;

  /**
   * An async iterator that iterates over events.
   * This iterator runs indefinitely.
   */
  [Symbol.asyncIterator](): AsyncIterator<T>;

  /**
   * Returns a promise that resolves with the first event emitted that matches the provided predicate.
   *
   * @param predicate
   */
  waitFor(predicate: (data: T) => boolean): Promise<T>;

  /**
   * Returns a promise that resolves once a specific number of events was emitted since this method was called.
   *
   * @param expectedCount
   */
  waitForCount(expectedCount: number): Promise<T>;

  /**
   * Turn any variant of `Event<T>` into an `Event<void>` discarding the callback parameter.
   */
  discardParameter(): Event<void>;

  /**
   * Triggers an event with at least `timeout` milliseconds between each event.
   * If the event is triggered more often, the event is delayed until the timeout is reached.
   * If event is emitted for the first time or event wasn't fired for `timeout` milliseconds,
   * the event is emitted after `timeout / 8` ms.
   */
  debounce(timeout?: number): Event<void>;
}

class EventListener<T> {
  public readonly callback: EventCallback<T> | WeakRef<EventCallback<T>>;

  private readonly _clearDispose?: () => void = undefined;

  constructor(
    event: Event<T>,
    listener: EventCallback<T>,
    public readonly ctx: Context,
    public readonly once: boolean,
    public readonly weak: boolean,
  ) {
    this._clearDispose = ctx.onDispose(() => {
      event._removeListener(this);
    });

    if (weak) {
      this.callback = new WeakRef(listener);
      weakListeners().registry?.register(
        listener,
        {
          event: new WeakRef(event),
          listener: this,
        },
        this,
      );
    } else {
      this.callback = listener;
    }
  }

  derefCallback(): EventCallback<T> | undefined {
    return this.weak ? (this.callback as WeakRef<EventCallback<T>>).deref() : (this.callback as EventCallback<T>);
  }

  trigger(data: T): void {
    let result!: MaybePromise<void>;
    try {
      const callback = this.derefCallback();
      result = callback?.(data);
    } catch (err: any) {
      this.ctx.raise(err);
    }

    if (!DO_NOT_ERROR_ON_ASYNC_CALLBACK) {
      if (result instanceof Promise) {
        throw new TypeError('Event has async callbacks, use emitAsync instead');
      }
    }
  }

  async triggerAsync(data: T): Promise<void> {
    try {
      const callback = this.derefCallback();
      await callback?.(data);
    } catch (err: any) {
      this.ctx.raise(err);
    }
  }

  remove(): void {
    this._clearDispose?.();
    weakListeners().registry?.unregister(this);
  }
}

type HeldValue = {
  event: WeakRef<Event<any>>;
  listener: EventListener<any>;
};

let weakListenersState: FinalizationRegistry<HeldValue> | null = null;

type WeakListeners = {
  registry: FinalizationRegistry<HeldValue> | undefined;
};

const FINALIZATION_REGISTRY_SUPPORTED = !!globalThis.FinalizationRegistry;

const weakListeners = (): WeakListeners => {
  if (!FINALIZATION_REGISTRY_SUPPORTED) {
    return { registry: undefined };
  }
  weakListenersState ??= new FinalizationRegistry(({ event, listener }) => {
    event.deref()?._removeListener(listener);
  });
  return { registry: weakListenersState };
};
