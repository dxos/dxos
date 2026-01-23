//
// Copyright 2024 DXOS.org
//

import { effect, untracked } from '@preact/signals-core';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type Path, findNode, isLiteralUnion, isNestedType } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Live, isLiveObject, live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getDeep, hyphenize, setDeep } from '@dxos/util';

// TODO(burdon): Rename package to @dxos/settings-store?

const cloneObject = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Settings group.
 */
export type SettingsValue = Record<string, any>;

export type SettingsProps<T extends SettingsValue> = {
  schema: Schema.Schema<T>;
  prefix: string;
  value?: Live<T> | T;
};

export interface SettingsStoreFactory {
  createStore<T extends SettingsValue>(props: SettingsProps<T>): SettingsStore<T>;
}

/**
 * Root store.
 */
export class RootSettingsStore implements SettingsStoreFactory {
  private readonly _stores = live<Record<string, SettingsStore<any>>>({});

  constructor(private readonly _storage: Storage = localStorage) {}

  toJSON() {
    return Object.entries(this._stores).reduce<Record<string, object>>((acc, [prefix, store]) => {
      acc[prefix] = store.value;
      return acc;
    }, {});
  }

  getStore<T extends SettingsValue>(prefix: string): SettingsStore<T> | undefined {
    return this._stores[prefix];
  }

  createStore<T extends SettingsValue>({ schema, prefix, value }: SettingsProps<T>): SettingsStore<T> {
    return untracked(() => {
      invariant(!this._stores[prefix]);
      const store = new SettingsStore<T>(schema, prefix, value, this._storage);
      this._stores[prefix] = store;
      return store;
    });
  }

  removeStore(prefix: string): void {
    untracked(() => {
      const store = this._stores[prefix];
      if (store) {
        store.close();
        delete this._stores[prefix];
      }
    });
  }

  destroy(): void {
    return untracked(() => {
      for (const [key, store] of Object.entries(this._stores)) {
        store.close();
        delete this._stores[key];
      }
    });
  }

  reset(): void {
    return untracked(() => {
      for (const store of Object.values(this._stores)) {
        store.reset();
      }
    });
  }
}

/**
 * Reactive key-value property store.
 */
export class SettingsStore<T extends SettingsValue> {
  private readonly _value: Live<T>;
  private readonly _defaults: T;
  private _unsubscribe?: () => void;

  constructor(
    private readonly _schema: Schema.Schema<T>,
    private readonly _prefix: string,
    value: Live<T> | T = {} as T,
    private readonly _storage: Storage = localStorage,
  ) {
    this._value = isLiveObject(value) ? value : live(value);
    this._defaults = cloneObject(this._value);
    this.load();
  }

  get prefix(): string {
    return this._prefix;
  }

  get value(): T {
    return this._value;
  }

  getKey(path: Path): string {
    return [this._prefix, ...path.map((p) => (typeof p === 'string' ? hyphenize(p) : String(p)))].join('/');
  }

  open(): void {
    // TODO(burdon): Import from '@dxos/signals' (rename echo-signals).
    this._unsubscribe = effect(() => {
      this.save();
    });
  }

  close(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  reset(): void {
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

  load(): false | undefined {
    this.close();

    for (const prop of SchemaAST.getPropertySignatures(this._schema.ast)) {
      const node = findNode(prop.type, nodeTest);
      invariant(node, `invalid prop: ${prop.name.toString()}`);

      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const value = this._storage.getItem(key);
      if (value != null) {
        try {
          if (SchemaAST.isStringKeyword(node)) {
            setDeep(this.value, path, value);
          } else if (SchemaAST.isNumberKeyword(node)) {
            setDeep(this.value, path, parseInt(value));
          } else if (SchemaAST.isBooleanKeyword(node)) {
            setDeep(this.value, path, value === 'true');
          } else if (SchemaAST.isEnums(node)) {
            const v = node.enums.find(([_, b]) => String(b) === value);
            if (v !== undefined) {
              setDeep(this.value, path, v[1]);
            }
          } else if (isLiteralUnion(node)) {
            setDeep(this.value, path, value);
          } else if (SchemaAST.isTupleType(node)) {
            setDeep(this.value, path, JSON.parse(value));
          } else if (SchemaAST.isTypeLiteral(node)) {
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

  save(): false | undefined {
    for (const prop of SchemaAST.getPropertySignatures(this._schema.ast)) {
      const node = findNode(prop.type, nodeTest);
      invariant(node, `invalid prop: ${prop.name.toString()}`);

      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const value = getDeep(this.value, path);
      if (value == null) {
        this._storage.removeItem(key);
      } else {
        if (SchemaAST.isStringKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (SchemaAST.isNumberKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (SchemaAST.isBooleanKeyword(node)) {
          this._storage.setItem(key, String(value));
        } else if (SchemaAST.isEnums(node)) {
          this._storage.setItem(key, String(value));
        } else if (isLiteralUnion(node)) {
          this._storage.setItem(key, String(value));
        } else if (SchemaAST.isTupleType(node)) {
          this._storage.setItem(key, JSON.stringify(value));
        } else if (SchemaAST.isTypeLiteral(node)) {
          this._storage.setItem(key, JSON.stringify(value));
          return false;
        }
      }
    }
  }
}

const nodeTest = (node: SchemaAST.AST) => {
  return (
    SchemaAST.isStringKeyword(node) ||
    SchemaAST.isNumberKeyword(node) ||
    SchemaAST.isBooleanKeyword(node) ||
    SchemaAST.isEnums(node) ||
    SchemaAST.isLiteral(node) ||
    SchemaAST.isTupleType(node) ||
    isLiteralUnion(node) ||
    isNestedType(node)
  );
};
