//
// Copyright 2023 DXOS.org
//

import { Signal } from '@preact/signals-core';
import { DeepSignal, deepSignal } from 'deepsignal';

import { UnsubscribeCallback } from '@dxos/async';

export type PropType<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined) => void;
};

/**
 * Local storage backed store.
 */
export class LocalStorageStore<T extends object> {
  static string: PropType<string> = {
    get: (key) => {
      const value = localStorage.getItem(key);
      return value === null ? undefined : value;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    },
  };

  static number: PropType<number> = {
    get: (key) => {
      const value = parseInt(localStorage.getItem(key) ?? '');
      return isNaN(value) ? undefined : value;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
    },
  };

  static bool: PropType<boolean> = {
    get: (key) => {
      return localStorage.getItem(key) === 'true';
    },
    set: (key, value) => {
      if (!value) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, 'true');
      }
    },
  };

  private readonly _subscriptions: UnsubscribeCallback[] = [];

  // TODO(burdon): Defaults (overwrite undefined).
  // TODO(burdon): Treat undefined as default value.
  constructor(public readonly values: DeepSignal<T> = deepSignal<T>({} as T)) {}

  /**
   * Binds signal property to local storage key.
   */
  bind<T>(prop: Signal<T | undefined>, key: string, type: PropType<T>) {
    prop.value = type.get(key);
    this._subscriptions.push(
      prop.subscribe((value) => {
        const current = type.get(key);
        console.log('###', current, value);
        if (value !== current) {
          type.set(key, value);
        }
      }),
    );

    return this;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
  }
}
