//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { AST, create, isReactiveObject, type ReactiveObject, type S } from '@dxos/echo-schema';
import { getBaseType, type Path } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getDeep, hyphenize, setDeep } from '@dxos/util';

// TODO(burdon): Rename package to @dxos/settings-store?

const cloneObject = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Settings group.
 */
export type SettingsValue = Record<string, any>;

export type SettingsProps<T extends SettingsValue> = {
  schema: S.Schema<T>;
  prefix: string;
  value?: ReactiveObject<T> | T;
};

export interface SettingsStoreFactory {
  createStore<T extends SettingsValue>(props: SettingsProps<T>): SettingsStore<T>;
}

/**
 * Root store.
 */
export class RootSettingsStore implements SettingsStoreFactory {
  private readonly _stores = new Map<string, SettingsStore<any>>();

  constructor(private readonly _storage: Storage = localStorage) {}

  toJSON() {
    return Array.from(this._stores).reduce<Record<string, object>>((acc, [prefix, store]) => {
      acc[prefix] = store.value;
      return acc;
    }, {});
  }

  getStore<T extends SettingsValue>(prefix: string): SettingsStore<T> | undefined {
    return this._stores.get(prefix);
  }

  createStore<T extends SettingsValue>({ schema, prefix, value }: SettingsProps<T>): SettingsStore<T> {
    invariant(!this._stores.has(prefix));
    const store = new SettingsStore<T>(schema, prefix, value, this._storage);
    this._stores.set(prefix, store);
    return store;
  }

  destroy() {
    for (const store of this._stores.values()) {
      store.close();
    }

    this._stores.clear();
  }

  reset() {
    for (const store of this._stores.values()) {
      store.reset();
    }
  }
}

/**
 * Reactive key-value property store.
 */
export class SettingsStore<T extends SettingsValue> {
  private readonly _value: ReactiveObject<T>;
  private readonly _defaults: T;
  private _unsubscribe?: () => void;

  constructor(
    private readonly _schema: S.Schema<T>,
    private readonly _prefix: string,
    value: ReactiveObject<T> | T = {} as T,
    private readonly _storage: Storage = localStorage,
  ) {
    this._value = isReactiveObject(value) ? value : create(value);
    this._defaults = cloneObject(this._value);
    this.load();
  }

  get value(): T {
    return this._value;
  }

  getKey(path: Path) {
    return [this._prefix, ...path.map((p) => (typeof p === 'string' ? hyphenize(p) : String(p)))].join('/');
  }

  open() {
    // TODO(burdon): Import from '@dxos/signals' (rename echo-signals).
    this._unsubscribe = effect(() => {
      this.save();
    });
  }

  close() {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  reset() {
    this.close();

    for (const prop of Object.keys(this._value)) {
      const value = this._defaults[prop];
      if (value !== undefined) {
        setDeep(this._value, [prop], value);
      } else {
        delete this._value[prop];
      }
    }

    this._storage.removeItem(this._prefix);
    for (const key of Object.keys(this._storage)) {
      if (key.startsWith(this._prefix)) {
        this._storage.removeItem(key);
      }
    }

    this.open();
  }

  load() {
    this.close();

    for (const prop of AST.getPropertySignatures(this._schema.ast)) {
      const node = getBaseType(prop.type)!;
      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const value = this._storage.getItem(key);
      if (value != null) {
        try {
          if (AST.isStringKeyword(node)) {
            setDeep(this.value, path, value);
          } else if (AST.isNumberKeyword(node)) {
            setDeep(this.value, path, parseInt(value));
          } else if (AST.isBooleanKeyword(node)) {
            setDeep(this.value, path, value === 'true');
          } else if (AST.isEnums(node)) {
            const v = node.enums.find(([_, b]) => String(b) === value);
            if (v !== undefined) {
              setDeep(this.value, path, v[1]);
            }
          } else if (AST.isTupleType(node)) {
            setDeep(this.value, path, JSON.parse(value));
          } else if (AST.isTypeLiteral(node)) {
            setDeep(this.value, path, JSON.parse(value));
            return false;
          }
        } catch (_err) {
          log.warn(`invalid value: ${key}`);
        }
      }
    }

    this.open();
  }

  save() {
    for (const prop of AST.getPropertySignatures(this._schema.ast)) {
      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const node = getBaseType(prop.type)!;
      const value = getDeep(this.value, path);
      if (value == null) {
        this._storage.removeItem(key);
      } else {
        if (AST.isStringKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (AST.isNumberKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (AST.isBooleanKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (AST.isEnums(node)) {
          this._storage.setItem(key, String(value));
        } else if (AST.isTupleType(node)) {
          this._storage.setItem(key, JSON.stringify(value));
        } else if (AST.isTypeLiteral(node)) {
          this._storage.setItem(key, JSON.stringify(value));
          return false;
        }
      }
    }
  }
}
