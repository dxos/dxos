//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Reconcile with Event unsubscribe function.
type Unsubscribe = () => void

/**
 * Tracks a number of subscriptions to free them all together.
 */
// TODO(burdon): Move to async?
export class SubscriptionGroup {
  private readonly _subscriptions: Unsubscribe[] = [];

  add (callback: Unsubscribe) {
    this._subscriptions.push(callback);
  }

  unsubscribe () {
    this._subscriptions.forEach(cb => cb());
  }
}
