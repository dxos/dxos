//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';

import { type CleanupFn } from '@dxos/async';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';
import { type Live, live } from '@dxos/live-object';
import { hyphenize } from '@dxos/util';

type PropType<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined) => void;
};

type PropDef<K extends keyof T, T> = {
  key: K;
  type: PropType<T[K]>;
};

type PropOptions = {
  // TODO(burdon): Default to true.
  allowUndefined?: boolean;
};

/**
 * Local storage backed store.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 * DevTools > Application > Local Storage
 * @deprecated
 */
// TODO(burdon): Remove.
export class LocalStorageStore<T extends object> {
  static string(): PropType<string>;
  static string(params: PropOptions): PropType<string | undefined>;
  static string(params?: PropOptions): PropType<string | undefined> | PropType<string> {
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
  static enum<U>(params: PropOptions): PropType<U | undefined>;
  static enum<U>(params?: PropOptions): PropType<U | undefined> | PropType<U> {
    return params?.allowUndefined
      ? (LocalStorageStore.string(params) as PropType<U | undefined>)
      : (LocalStorageStore.string() as unknown as PropType<U>);
  }

  static number(): PropType<number>;
  static number(params: PropOptions): PropType<number | undefined>;
  static number(params?: PropOptions): PropType<number | undefined> | PropType<number> {
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
  static bool(params: PropOptions): PropType<boolean | undefined>;
  static bool(params?: PropOptions): PropType<boolean | undefined> | PropType<boolean> {
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

  private readonly _subscriptions = new Map<string, CleanupFn>();

  private readonly _values: Live<T>;

  constructor(
    private readonly _prefix: string,
    defaults?: T,
  ) {
    // TODO(burdon): Should this be externalized.
    registerSignalsRuntime();
    this._values = live(defaults ?? ({} as T));
  }

  get values(): Live<T> {
    return this._values;
  }

  /**
   * Binds signal property to local storage key.
   */
  prop<K extends keyof T>({ key, type }: PropDef<K, T>): this {
    invariant(typeof key === 'string');
    const storageKey = this._prefix + '/' + hyphenize(key);
    if (this._subscriptions.has(storageKey)) {
      return this;
    }

    const current = type.get(storageKey);
    if (current !== undefined) {
      this._values[key as K] = current;
    }

    // The subscribe callback is always called.
    this._subscriptions.set(
      storageKey,
      effect(() => {
        const value = this._values[key];
        const current = type.get(storageKey);
        if (value !== current) {
          type.set(storageKey, value);
        }
      }),
    );

    return this;
  }

  /**
   * Delete all settings.
   */
  reset(): void {
    localStorage.removeItem(this._prefix);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(this._prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Expunges all store-related items from local storage.
   */
  expunge(): void {
    this._subscriptions.forEach((_, key) => localStorage.removeItem(key));
  }

  close(): void {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }
}
