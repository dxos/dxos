//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';

import type { UnsubscribeCallback } from '@dxos/async';
import { type ReactiveObject, create } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';

type PropType<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined) => void;
};

/**
 * Local storage backed store.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 * DevTools > Application > Local Storage
 */
export class LocalStorageStore<T extends object> {
  static string(): PropType<string>;
  static string(params: { allowUndefined: boolean }): PropType<string | undefined>;
  static string(params?: { allowUndefined: boolean }) {
    const prop: PropType<string | undefined> = {
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

    return params?.allowUndefined ? (prop as PropType<string | undefined>) : (prop as PropType<string>);
  }

  static enum<U>(): PropType<U>;
  static enum<U>(params: { allowUndefined: boolean }): PropType<U | undefined>;
  static enum<U>(params?: { allowUndefined: boolean }) {
    return params?.allowUndefined
      ? (LocalStorageStore.string(params) as PropType<U | undefined>)
      : (LocalStorageStore.string() as unknown as PropType<U>);
  }

  static number(): PropType<number>;
  static number(params: { allowUndefined: boolean }): PropType<number | undefined>;
  static number(params?: { allowUndefined: boolean }) {
    const prop: PropType<number | undefined> = {
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

    return params?.allowUndefined ? (prop as PropType<number | undefined>) : (prop as PropType<number>);
  }

  static bool(): PropType<boolean>;
  static bool(params: { allowUndefined: boolean }): PropType<boolean | undefined>;
  static bool(params?: { allowUndefined: boolean }) {
    const prop: PropType<boolean | undefined> = {
      get: (key) => {
        const value = localStorage.getItem(key);
        return value === 'true' ? true : value === 'false' ? false : undefined;
      },
      set: (key, value) => {
        if (value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, String(value));
        }
      },
    };

    return params?.allowUndefined ? (prop as PropType<boolean | undefined>) : (prop as PropType<boolean>);
  }

  static json<U>(): PropType<U> {
    return {
      get: (key) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : undefined;
      },
      set: (key, value) => {
        if (value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      },
    };
  }

  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  public readonly values: ReactiveObject<T>;

  constructor(
    private readonly _prefix: string,
    defaults?: T,
  ) {
    registerSignalRuntime();
    this.values = create(defaults ?? ({} as T));
  }

  // TODO(burdon): Reset method (keep track of binders).

  /**
   * Binds signal property to local storage key.
   */
  prop<K extends keyof T>({
    key,
    storageKey: _storageKey,
    type,
  }: {
    key: K;
    storageKey?: string;
    type: PropType<T[K]>;
  }) {
    const storageKey = this._prefix + '/' + (_storageKey ?? key).toString();
    if (this._subscriptions.has(storageKey)) {
      return this;
    }

    const current = type.get(storageKey);
    if (current !== undefined) {
      this.values[key] = current;
    }

    // The subscribe callback is always called.
    this._subscriptions.set(
      storageKey,
      effect(() => {
        const value = this.values[key];
        const current = type.get(storageKey);
        if (value !== current) {
          type.set(storageKey, value);
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
