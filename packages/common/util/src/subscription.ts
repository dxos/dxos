//
// Copyright 2021 DXOS.org
//

/**
 * A callback to call to unsubscribe from a subscription or free a resource.
 */
export type Unsubscribe = () => void;

/**
 * Tracks a number of subscriptions to free them all together.
 */
export class SubscriptionGroup {
  private _subscriptions: Unsubscribe[] = [];

  push (callback: Unsubscribe) {
    this._subscriptions.push(callback);
  }

  unsubscribe () {
    this._subscriptions.forEach(cb => cb());
    this._subscriptions = [];
  }
}
