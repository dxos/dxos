//
// Copyright 2022 DXOS.org
//

import { UnsubscribeCallback } from './events';

export interface Observable<Events> {
  subscribe(callbacks: Events): UnsubscribeCallback;
  unsubscribe(): void;
}

/**
 * Implements subscriptions.
 */
export class ObservableProvider<Events> implements Observable<Events> {
  protected _callbacks?: Events;

  get callbacks() {
    return this._callbacks;
  }

  subscribe(callbacks: Events): UnsubscribeCallback {
    this._callbacks = callbacks;
    return () => this.unsubscribe();
  }

  unsubscribe() {
    this._callbacks = undefined;
  }
}

export interface CancellableObservableEvents {
  onCancelled(): void;
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
    this.callbacks?.onCancelled();

    if (unsubscribe) {
      this.unsubscribe();
    }
  }
}
