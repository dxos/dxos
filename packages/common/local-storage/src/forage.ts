//
// Copyright 2024 DXOS.org
//

import { type Signal } from '@preact/signals-core';
import { type DeepSignal, deepSignal } from 'deepsignal';
import localforage from 'localforage';

import type { UnsubscribeCallback } from '@dxos/async';

/**
 * Local storage backed store.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/await localforage
 * DevTools > Application > Local Storage
 */
export class LocalForageStore<T extends object> {
  private async _get(key: string) {
    const value = await localforage.getItem<any>(key);
    return value === null ? undefined : value;
  }

  private async _set(key: string, value: any) {
    if (value === undefined) {
      await localforage.removeItem(key);
    } else {
      await localforage.setItem(key, value);
    }
  }

  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  public readonly values: DeepSignal<T>;

  constructor(
    private readonly _prefix: string,
    defaults?: T,
  ) {
    this.values = deepSignal<T>(defaults ?? ({} as T));
  }

  // TODO(burdon): Reset method (keep track of binders).

  /**
   * Binds signal property to local storage key.
   */
  async prop<T>(prop: Signal<T | undefined>, lkey: string) {
    const key = this._prefix + '/' + lkey;
    if (this._subscriptions.has(key)) {
      return this;
    }

    const current = await this._get(key);
    if (current !== undefined) {
      prop.value = current;
    }

    // The subscribe callback is always called.
    this._subscriptions.set(
      key,
      // TODO(mykola): Asynchronous events could mess up React rendering.
      prop.subscribe(async (value) => {
        const current = await this._get(key);
        if (value !== current) {
          await this._set(key, value);
        }
      }),
    );

    return this;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }
}
