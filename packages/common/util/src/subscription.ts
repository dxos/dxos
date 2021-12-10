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
  private _subscriptions: Record<string, Unsubscribe> = {};

  push (callback: Unsubscribe, key?: string) {
    key = key ?? (Object.keys(this._subscriptions).length + 1).toString();
    this._subscriptions[key] = callback;
  }

  subscriptionExists (key: string) {
    return Boolean(this._subscriptions[key]);
  }

  unsubscribe () {
    Object.values(this._subscriptions).forEach(cb => cb());
    this._subscriptions = {};
  }
}
