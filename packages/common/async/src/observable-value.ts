//
// Copyright 2022 DXOS.org
//

import { createSetDispatch } from '@dxos/util';

import { type CleanupFn } from './cleanup';

/**
 * Return type for processes that support cancellable subscriptions.
 * The handler object implements the observable events.
 * @deprecated
 */
export interface ObservableValue<Events, Value = unknown> {
  value?: Value;
  setValue(value: Value): void;
  subscribe(handler: Events): CleanupFn;
}

/**
 * Provider that manages a set of subscriptions.
 * @deprecated
 */
// TODO(burdon): Support multiple subscribers.
//  https://betterprogramming.pub/compare-leading-javascript-functional-reactive-stream-libraries-544163c1ded6
//  https://github.com/apollographql/apollo-client/tree/main/src/utilities/observables
//  https://github.com/mostjs/core
export class ObservableProvider<Events extends {}, Value = unknown> implements ObservableValue<Events, Value> {
  protected readonly _handlers = new Set<Events>();
  private readonly _proxy = createSetDispatch<Events>({
    handlers: this._handlers,
  });

  private _value?: Value;

  /**
   * Proxy used to dispatch callbacks to each subscription.
   */
  get callback(): Events {
    return this._proxy;
  }

  get value() {
    return this._value;
  }

  setValue(value: Value): void {
    this._value = value;
  }

  subscribe(handler: Events): CleanupFn {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }
}

/**
 * @deprecated
 */
export interface CancellableObservableEvents {
  onCancelled?(): void;
}

/**
 * @deprecated
 */
export interface CancellableObservable<Events extends CancellableObservableEvents, Value = unknown>
  extends ObservableValue<Events, Value> {
  cancel(): Promise<void>;
}

/**
 * Implements subscriptions with ability to be cancelled.
 * @deprecated
 */
export class CancellableObservableProvider<
  Events extends CancellableObservableEvents,
> extends ObservableProvider<Events> {
  private _cancelled = false;

  constructor(private readonly _handleCancel?: () => Promise<void>) {
    super();
  }

  get cancelled() {
    return this._cancelled;
  }

  async cancel(): Promise<void> {
    if (this._cancelled) {
      return;
    }

    this._cancelled = true;
    await this._handleCancel?.();
    this.callback.onCancelled?.();
  }
}
