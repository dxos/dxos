//
// Copyright 2022 DXOS.org
//

import { UnsubscribeCallback } from './events';

export interface ObservableSubscription<Events> {
  id: string;
  events: Events;
  unsubscribe: UnsubscribeCallback;
}

export interface Observable<Events> {
  subscribe(callbacks: Events): ObservableSubscription<Events>;
  unsubscribe(): void;
}

/**
 * Implements subscriptions.
 */
// TODO(burdon): Support multiple subscribers.
//  https://betterprogramming.pub/compare-leading-javascript-functional-reactive-stream-libraries-544163c1ded6
//  https://github.com/apollographql/apollo-client/tree/main/src/utilities/observables
//  https://github.com/mostjs/core
export class ObservableProvider<Events> implements Observable<Events> {
  protected _callbacks?: Events;

  // TODO(burdon): Remove.
  get callbacks() {
    return this._callbacks;
  }

  // TODO(burdon): Return handle.
  subscribe(callbacks: Events): ObservableSubscription<Events> {
    this._callbacks = callbacks;
    return {
      id: '',
      events: callbacks,
      unsubscribe: () => {}
    };
    // return () => this.unsubscribe();
  }

  unsubscribe() {
    this._callbacks = undefined;
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

  // prettier-ignore
  constructor(
    private readonly _handleCancel?: () => Promise<void>
  ) {
    super();
  }

  get cancelled() {
    return this._cancelled;
  }

  async cancel(unsubscribe = true) {
    if (this._cancelled) {
      return;
    }

    this._cancelled = true;
    await this._handleCancel?.();
    this.callbacks?.onCancelled?.();

    if (unsubscribe) {
      this.unsubscribe();
    }
  }
}
