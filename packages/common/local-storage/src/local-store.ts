//
// Copyright 2023 DXOS.org
//

import { Atom, Registry, type Registry as RegistryType } from '@effect-atom/atom-react';

import { type CleanupFn } from '@dxos/async';
import { invariant } from '@dxos/invariant';
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
  private readonly _atom: Atom.Writable<T>;
  private readonly _registry: RegistryType.Registry;

  constructor(
    private readonly _prefix: string,
    defaults?: T,
    registry?: RegistryType.Registry,
  ) {
    this._registry = registry ?? Registry.make();
    this._atom = Atom.make<T>(defaults ?? ({} as T));
  }

  get atom(): Atom.Writable<T> {
    return this._atom;
  }

  get registry(): RegistryType.Registry {
    return this._registry;
  }

  get values(): T {
    return this._registry.get(this._atom);
  }

  /**
   * Update the values using an updater function.
   * @param updater A function that receives the current values and returns the updated values.
   */
  update(updater: (current: T) => T): void {
    const current = this._registry.get(this._atom);
    this._registry.set(this._atom, updater(current));
  }

  /**
   * Set values directly.
   * @param values The new values to set.
   */
  set(values: Partial<T>): void {
    const current = this._registry.get(this._atom);
    this._registry.set(this._atom, { ...current, ...values });
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
      this._registry.set(this._atom, {
        ...this._registry.get(this._atom),
        [key]: current,
      });
    }

    // Prime the atom before subscribing.
    this._registry.get(this._atom);

    // Subscribe to changes.
    this._subscriptions.set(
      storageKey,
      this._registry.subscribe(this._atom, () => {
        const values = this._registry.get(this._atom);
        const value = values[key];
        const currentStored = type.get(storageKey);
        if (value !== currentStored) {
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
