//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type Path, findNode, isLiteralUnion, isNestedType } from '@dxos/effect';
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
  schema: Schema.Schema<T>;
  prefix: string;
  atom?: Atom.Writable<T>;
};

export interface SettingsStoreFactory {
  createStore<T extends SettingsValue>(props: SettingsProps<T>): SettingsStore<T>;
}

/**
 * Root store.
 */
export class RootSettingsStore implements SettingsStoreFactory {
  private readonly _stores: Record<string, SettingsStore<any>> = {};

  constructor(
    private readonly _registry: Registry.Registry,
    private readonly _storage: Storage = localStorage,
  ) {}

  get registry(): Registry.Registry {
    return this._registry;
  }

  toJSON() {
    return Object.entries(this._stores).reduce<Record<string, object>>((acc, [prefix, store]) => {
      acc[prefix] = this._registry.get(store.atom);
      return acc;
    }, {});
  }

  getStore<T extends SettingsValue>(prefix: string): SettingsStore<T> | undefined {
    return this._stores[prefix];
  }

  createStore<T extends SettingsValue>({ schema, prefix, atom }: SettingsProps<T>): SettingsStore<T> {
    invariant(!this._stores[prefix]);
    const store = new SettingsStore<T>(this._registry, schema, prefix, atom, this._storage);
    this._stores[prefix] = store;
    return store;
  }

  removeStore(prefix: string): void {
    const store = this._stores[prefix];
    if (store) {
      store.close();
      delete this._stores[prefix];
    }
  }

  destroy(): void {
    for (const [key, store] of Object.entries(this._stores)) {
      store.close();
      delete this._stores[key];
    }
  }

  reset(): void {
    for (const store of Object.values(this._stores)) {
      store.reset();
    }
  }
}

/**
 * Reactive key-value property store.
 */
export class SettingsStore<T extends SettingsValue> {
  private readonly _atom: Atom.Writable<T>;
  private readonly _defaults: T;
  private _unsubscribe?: () => void;

  constructor(
    private readonly _registry: Registry.Registry,
    private readonly _schema: Schema.Schema<T>,
    private readonly _prefix: string,
    atom?: Atom.Writable<T>,
    private readonly _storage: Storage = localStorage,
  ) {
    this._atom = atom ?? Atom.make<T>({} as T);
    this._defaults = cloneObject(this._registry.get(this._atom));
    this.load();
  }

  get prefix(): string {
    return this._prefix;
  }

  get atom(): Atom.Writable<T> {
    return this._atom;
  }

  get value(): T {
    return this._registry.get(this._atom);
  }

  getKey(path: Path): string {
    return [this._prefix, ...path.map((p) => (typeof p === 'string' ? hyphenize(p) : String(p)))].join('/');
  }

  open(): void {
    // Prime the atom before subscribing to avoid double-fire on first mutation.
    this._registry.get(this._atom);
    this._unsubscribe = this._registry.subscribe(this._atom, () => {
      this.save();
    });
  }

  close(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  reset(): void {
    this.close();

    const current = this._registry.get(this._atom);
    const updated = { ...current };
    for (const prop of Object.keys(current)) {
      const value = this._defaults[prop];
      if (value !== undefined) {
        setDeep(updated, [prop], value);
      } else {
        delete updated[prop];
      }
    }
    this._registry.set(this._atom, updated as T);

    this._storage.removeItem(this._prefix);
    for (const key of Object.keys(this._storage)) {
      if (key.startsWith(this._prefix)) {
        this._storage.removeItem(key);
      }
    }

    // Save reset values to storage.
    this.save();

    this.open();
  }

  load(): false | undefined {
    this.close();

    const current = this._registry.get(this._atom);
    const updated = { ...current };
    let hasTypeLiteral = false;

    for (const prop of SchemaAST.getPropertySignatures(this._schema.ast)) {
      const node = findNode(prop.type, nodeTest);
      invariant(node, `invalid prop: ${prop.name.toString()}`);

      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const value = this._storage.getItem(key);
      if (value != null) {
        try {
          if (SchemaAST.isStringKeyword(node)) {
            setDeep(updated, path, value);
          } else if (SchemaAST.isNumberKeyword(node)) {
            setDeep(updated, path, parseInt(value));
          } else if (SchemaAST.isBooleanKeyword(node)) {
            setDeep(updated, path, value === 'true');
          } else if (SchemaAST.isEnums(node)) {
            const v = node.enums.find(([_, b]) => String(b) === value);
            if (v !== undefined) {
              setDeep(updated, path, v[1]);
            }
          } else if (isLiteralUnion(node)) {
            setDeep(updated, path, value);
          } else if (SchemaAST.isTupleType(node)) {
            setDeep(updated, path, JSON.parse(value));
          } else if (SchemaAST.isTypeLiteral(node)) {
            setDeep(updated, path, JSON.parse(value));
            hasTypeLiteral = true;
          }
        } catch (_err) {
          log.warn(`invalid value: ${key}`);
        }
      }
    }

    this._registry.set(this._atom, updated as T);

    // Save initial values to storage.
    this.save();

    this.open();

    if (hasTypeLiteral) {
      return false;
    }
  }

  save(): false | undefined {
    const current = this._registry.get(this._atom);
    let hasTypeLiteral = false;

    for (const prop of SchemaAST.getPropertySignatures(this._schema.ast)) {
      const node = findNode(prop.type, nodeTest);
      invariant(node, `invalid prop: ${prop.name.toString()}`);

      const path = [prop.name.toString()];
      const key = this.getKey(path);
      const value = getDeep(current, path);
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
          hasTypeLiteral = true;
        }
      }
    }

    if (hasTypeLiteral) {
      return false;
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
