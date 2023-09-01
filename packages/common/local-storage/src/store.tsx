//
// Copyright 2023 DXOS.org
//

import { Signal } from '@preact/signals-core';
import { DeepSignal, deepSignal } from 'deepsignal';

import { UnsubscribeCallback } from '@dxos/async';

export type ISettingType<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined) => void;
};

/**
 * Local storage backed store.
 */
export class LocalStorageStore<T extends object> {
  static string: ISettingType<string> = {
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

  static number: ISettingType<number> = {
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

  static bool: ISettingType<boolean> = {
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

  public readonly values: DeepSignal<T> = deepSignal<T>({} as T);
  private readonly _subscriptions: UnsubscribeCallback[] = [];

  /**
   * Binds signal property to local storage key.
   */
  bind<T>(prop: Signal<T | undefined>, key: string, type: ISettingType<T>) {
    prop.value = type.get(key);
    this._subscriptions.push(
      prop.subscribe((value) => {
        type.set(key, value);
      }),
    );

    return this;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
  }
}
