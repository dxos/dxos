//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import get from 'lodash.get';
import set from 'lodash.set';

import { AST, type ReactiveObject, type S, create } from '@dxos/echo-schema';
import { visit } from '@dxos/effect';
import { log } from '@dxos/log';
import { hyphenize } from '@dxos/util';

const cloneObject = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Reactive key-value property store.
 */
// TODO(burdon): Rename package to @dxos/settings-store?
export class SettingsStore<T extends {}> {
  public _value: ReactiveObject<T>;

  private _unsubscribe?: () => void;

  constructor(
    private readonly _schema: S.Schema<T>,
    private readonly _prefix: string,
    private readonly _defaultValue: T = {} as T,
    private readonly _storage: Storage = localStorage,
  ) {
    this._value = create(cloneObject(this._defaultValue));
    this.load();
  }

  get value(): T {
    return this._value;
  }

  getKey(path: string[]) {
    return [this._prefix, ...path.map((p) => hyphenize(p))].join('/');
  }

  open() {
    // TODO(burdon): Import from '@dxos/signals' (rename echo-signals).
    this._unsubscribe = effect(() => {
      this._value; // Reference triggers subscription.
      this.save();
    });
  }

  close() {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  // TODO(burdon): Create singleton.
  reset() {
    this.close();

    this._value = create(cloneObject(this._defaultValue));
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

    visit(this._schema.ast, (node, path) => {
      const key = this.getKey(path);
      const value = this._storage.getItem(key);
      if (value != null) {
        try {
          if (AST.isStringKeyword(node)) {
            set(this.value, path, value);
          } else if (AST.isNumberKeyword(node)) {
            set(this.value, path, parseInt(value));
          } else if (AST.isBooleanKeyword(node)) {
            set(this.value, path, value === 'true');
          } else if (AST.isEnums(node)) {
            const v = node.enums.find(([_, b]) => String(b) === value);
            if (v !== undefined) {
              set(this.value, path, v[1]);
            }
          } else if (AST.isTupleType(node)) {
            set(this.value, path, JSON.parse(value));
          } else if (AST.isTypeLiteral(node)) {
            set(this.value, path, JSON.parse(value));
          }
        } catch (_err) {
          log.warn(`invalid value: ${key}`);
        }
      }
    });

    this.open();
  }

  save() {
    visit(this._schema.ast, (node, path) => {
      const key = this.getKey(path);
      const value = get(this.value, path);
      if (value === undefined) {
        this._storage.removeItem(key);
      } else {
        if (AST.isStringKeyword(node)) {
          this._storage.setItem(key, value);
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
        }
      }
    });
  }
}
