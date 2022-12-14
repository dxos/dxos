//
// Copyright 2022 DXOS.org
//

import { createSetDispatch } from '@dxos/util';

import { UnsubscribeCallback } from './events';

/**
 * Return type for processes that support cancellable subscriptions.
 * The handler object implements the observable events.
 */
export interface Observable<Events> {
  subscribe(handler: Events): UnsubscribeCallback;
}

/**
 * Provider that manages a set of subscriptions.
 */
// TODO(burdon): Support multiple subscribers.
//  https://betterprogramming.pub/compare-leading-javascript-functional-reactive-stream-libraries-544163c1ded6
//  https://github.com/apollographql/apollo-client/tree/main/src/utilities/observables
//  https://github.com/mostjs/core
export class ObservableProvider<Events extends {}> implements Observable<Events> {
  protected readonly _handlers = new Set<Events>();
  private readonly _proxy = createSetDispatch<Events>({
    handlers: this._handlers
  });

  /**
   * Proxy used to dispatch callbacks to each subscription.
   */
  get callback(): Events {
    return this._proxy;
  }

  subscribe(handler: Events): UnsubscribeCallback {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }
}

export interface CancellableObservableEvents {
  onCancelled?(): void;
}

export interface CancellableObservable<Events extends CancellableObservableEvents> extends Observable<Events> {
  cancel(): Promise<void>;
}

/**
 * Implements subscriptions with ability to be cancelled.
 */
export class CancellableObservableProvider<
  Events extends CancellableObservableEvents
> extends ObservableProvider<Events> {
  private _cancelled = false;
  private readonly _onCancel?;

  // prettier-ignore
  constructor({
    onCancel
  }: {
    onCancel?: () => Promise<void>
  }) {
    super();
    this._onCancel = onCancel;
  }

  get cancelled() {
    return this._cancelled;
  }

  async cancel() {
    if (this._cancelled) {
      return;
    }

    this._cancelled = true;
    await this._onCancel?.();
    this.callback.onCancelled?.();
  }
}
