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
// TODO(burdon): Move to async?
export class SubscriptionGroup {
  private _subscriptions: Unsubscribe[] = [];

  // TODO(dmaretskyi): Rename to add.
  push (callback: Unsubscribe) {
    this._subscriptions.push(callback);
  }

  unsubscribe () {
    this._subscriptions.forEach(cb => cb());
    this._subscriptions = [];
  }
}
