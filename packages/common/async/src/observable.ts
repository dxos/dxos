//
// Copyright 2022 DXOS.org
//

import { UnsubscribeCallback } from './events';

export interface Observable<Events> {
  // bind(observable: ObservableProvider<Events>): void;
  subscribe(callbacks: Events): void;
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

  // TODO(burdon): Bind.
  // bind(observable: ObservableProvider<Events>) {
  //   return this;
  // }

  subscribe(callbacks: Events): UnsubscribeCallback {
    this._callbacks = callbacks;
    return () => this.unsubscribe();
  }

  unsubscribe() {
    this._callbacks = undefined;
  }
}

export interface CancellableObservableEvents {
  onCancel(): void;
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
  // prettier-ignore
  constructor(
    private readonly _handleCancel = async () => this._callbacks?.onCancel()
  ) {
    super();
  }

  async cancel(unsubscribe = true) {
    if (this._handleCancel) {
      await this._handleCancel();
    }

    this.callbacks?.onCancel();

    if (unsubscribe) {
      this.unsubscribe();
    }
  }
}
