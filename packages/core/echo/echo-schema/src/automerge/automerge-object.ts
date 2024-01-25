//
// Copyright 2023 DXOS.org
//

import { type InspectOptionsStylized, inspect } from 'node:util';

import { Event, Trigger } from '@dxos/async';
import { next as automerge, type ChangeOptions, type ChangeFn, type Doc, type Heads } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Reference } from '@dxos/document-model';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TextModel } from '@dxos/text-model';

import { AutomergeArray } from './automerge-array';
import { type AutomergeDb } from './automerge-db';
import { type DocStructure, type ObjectSystem } from './types';
import { type EchoDatabase } from '../database';
import {
  isAutomergeObject,
  TextObject,
  type TypedObjectOptions,
  type EchoObject,
  type ObjectMeta,
  type TypedObjectProperties,
  base,
  data,
  db,
  debug,
  immutable,
  mutationOverride,
  proxy,
  subscribe,
} from '../object';
import { AbstractEchoObject } from '../object/object';
import { type Schema } from '../proto';
import { compositeRuntime } from '../util';

export type BindOptions = {
  db: AutomergeDb;
  docHandle: DocHandle<DocStructure>;
  path: string[];
  ignoreCache?: boolean;
};

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

export class AutomergeObject implements TypedObjectProperties {
  private _database?: AutomergeDb = undefined;
  private _doc?: Doc<any> = undefined;
  private _docHandle?: DocHandle<DocStructure> = undefined;
  private _schema?: Schema = undefined;
  private readonly _immutable: boolean; // TODO(burdon): Not used.

  /**
   * @internal
   */
  _path: string[] = [];
  protected readonly _signal = compositeRuntime.createSignal();

  private _updates = new Event();

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * @internal
   */
  _linkCache: Map<string, EchoObject> | undefined = new Map<string, EchoObject>();

  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  constructor(initialProps?: unknown, opts?: TypedObjectOptions) {
    this._initNewObject(initialProps, opts);

    if (opts?.schema) {
      this._schema = opts.schema;
    }

    // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
    //  References should not leak outside of the AutomergeObject, It should be internal concept.
    const type =
      opts?.type ??
      (this._schema
        ? this._schema[immutable]
          ? Reference.fromLegacyTypename(opts!.schema!.typename)
          : this._linkObject(this._schema)
        : undefined);
    if (type) {
      this.__system.type = type;
    }
    this._immutable = opts?.immutable ?? false;

    return this._createProxy(['data']);
  }

  get __typename(): string | undefined {
    if (this.__schema) {
      return this.__schema?.typename;
    }
    // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
    const typeRef = this.__system.type;
    if (typeRef?.protocol === 'protobuf') {
      return typeRef?.itemId;
    } else {
      return undefined;
    }
  }

  get __schema(): Schema | undefined {
    return this[base]._getSchema();
  }

  get __meta(): ObjectMeta {
    return this._createProxy(['meta']);
  }

  get __system(): ObjectSystem {
    return this._createProxy(['system']);
  }

  get __deleted(): boolean {
    return this.__system?.deleted ?? false;
  }

  toJSON() {
    return this[data];
  }

  get id(): string {
    return this._id;
  }

  [base] = this as any;

  get [db](): EchoDatabase | undefined {
    return this[base]._database._echoDatabase;
  }

  get [debug](): string {
    return 'automerge';
  }

  get [immutable](): boolean {
    return !!this[base]?._immutable;
  }

  get [data](): any {
    let value = this[base]._getDoc();
    for (const key of this[base]._path) {
      value = value?.[key];
    }
    const typeRef = this.__system.type;

    return {
      // TODO(mykola): Delete backend (for debug).
      '@backend': 'automerge',
      '@id': this._id,
      '@type': typeRef
        ? {
            '@type': REFERENCE_TYPE_TAG,
            itemId: typeRef.itemId,
            protocol: typeRef.protocol,
            host: typeRef.host,
          }
        : undefined,
      ...(this.__deleted ? { '@deleted': this.__deleted } : {}),
      '@meta': value.meta,
      ...value.data,
    };
  }

  get [Symbol.toStringTag]() {
    return this.__schema?.typename ?? 'Expando';
  }

  // TODO(dmaretskyi): Always prints root even for nested proxies.
  [inspect.custom](
    depth: number,
    options: InspectOptionsStylized,
    inspect_: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    return `${this[Symbol.toStringTag]} ${inspect(this[data])}`;
  }

  [subscribe](callback: (value: AutomergeObject) => void): () => void {
    const listener = (event: DocHandleChangePayload<DocStructure>) => {
      if (objectIsUpdated(this._id, event)) {
        callback(this);
      }
    };

    this[base]._docHandle?.on('change', listener);
    this[base]._updates.on(callback);
    return () => {
      this[base]._docHandle?.off('change', listener);
      this[base]._updates.off(callback);
    };
  }

  private _initNewObject(initialProps?: unknown, opts?: TypedObjectOptions) {
    initialProps ??= {};

    if (opts?.schema) {
      for (const field of opts.schema.props) {
        if (field.repeated) {
          (initialProps as Record<string, any>)[field.id!] ??= [];
        } else if (field.type === getSchemaProto().PropType.REF && field.refModelType === TextModel.meta.type) {
          // TODO(dmaretskyi): Is this right? Should we init with empty string or an actual reference to a Text object?
          (initialProps as Record<string, any>)[field.id!] ??= new TextObject();
        }
      }
    }

    this._doc = automerge.from({
      data: this._encode(initialProps),
      meta: this._encode({
        keys: [],
        ...opts?.meta,
      }),
    });
  }

  /**
   * @internal
   */
  _bind(options: BindOptions) {
    const binded = new Trigger();
    this._database = options.db;
    this._docHandle = options.docHandle;
    this._docHandle.on('change', async (event) => {
      if (objectIsUpdated(this._id, event)) {
        // Note: We need to notify listeners only after _docHandle initialization with cached _doc.
        //       Without it there was race condition in SpacePlugin on Folder creation.
        //       Folder was being accessed during bind process before _docHandle was initialized and after _doc was set to undefined.
        await binded.wait();
        this._notifyUpdate();
      }
    });
    this._path = options.path;

    if (this._linkCache) {
      for (const obj of this._linkCache.values()) {
        this._database!.add(obj);
      }

      this._linkCache = undefined;
    }

    if (options.ignoreCache) {
      this._doc = undefined;
    }

    if (this._doc) {
      const doc = this._doc;
      this._doc = undefined;
      this._set([], doc);
    }
    binded.wake();
  }

  private _createProxy(path: string[]): any {
    return new Proxy(this, {
      ownKeys: (target) => {
        // TODO(mykola): Add support for expando objects.
        return this.__schema?.props.map((field) => field.id!) ?? [];
      },

      has: (_, key) => {
        if (!isValidKey(key)) {
          return Reflect.has(this, key);
        } else if (typeof key === 'symbol') {
          // TODO(mykola): Copied from TypedObject, do we need this?
          return false;
        } else {
          return key in this._get(path);
        }
      },

      getOwnPropertyDescriptor: (_, key) => {
        return {
          enumerable: true,
          configurable: true, // TODO(dmaretskyi): Are they really configurable?
        };
      },

      get: (_, key) => {
        // Enable detection of proxy objects.
        if (key === proxy) {
          return true;
        }

        if (!isValidKey(key)) {
          return Reflect.get(this, key);
        }

        const relativePath = [...path, ...(key as string).split('.')];

        const value = this._get(relativePath);

        if (value instanceof AbstractEchoObject || value instanceof AutomergeObject || value instanceof TextObject) {
          return value;
        }
        if (value instanceof Reference && value.protocol === 'protobuf') {
          // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
          return value;
        }
        if (Array.isArray(value)) {
          return new AutomergeArray()._attach(this[base], relativePath);
        }
        if (typeof value === 'object' && value !== null) {
          return this._createProxy(relativePath);
        }

        return value;
      },

      set: (_, key, value) => {
        const relativePath = [...path, ...(key as string).split('.')];
        if (this[base]._immutable && !mutationOverride) {
          log.warn('Read only access');
          return false;
        }
        this._set(relativePath, value);
        return true;
      },
    });
  }

  /**
   * @internal
   */
  _get(path: string[]) {
    this._signal.notifyRead();

    const fullPath = [...this._path, ...path];
    let value = this._getDoc();
    for (const key of fullPath) {
      value = value?.[key];
    }

    return this._decode(value);
  }

  /**
   * @internal
   */
  _set(path: string[], value: any) {
    const fullPath = [...this._path, ...path];

    const changeFn: ChangeFn<any> = (doc) => {
      let parent = doc;
      for (const key of fullPath.slice(0, -1)) {
        parent[key] ??= {};
        parent = parent[key];
      }
      parent[fullPath.at(-1)!] = this._encode(value);

      if (value instanceof AutomergeArray) {
        value._attach(this[base], path);
      }
    };

    this._change(changeFn);
  }

  /**
   * @internal
   */
  _change(changeFn: ChangeFn<any>) {
    if (this._docHandle) {
      this._docHandle.change(changeFn);
      // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
    } else if (this._doc) {
      this._doc = automerge.change(this._doc, changeFn);
      this._notifyUpdate();
    } else {
      failedInvariant();
    }
  }

  /**
   * @internal
   */
  _encode(value: any) {
    if (value instanceof automerge.RawString) {
      return value;
    }
    if (value === undefined) {
      return null;
    }
    if (value instanceof AbstractEchoObject || value instanceof AutomergeObject) {
      const reference = this._linkObject(value);
      return encodeReference(reference);
    }
    if (value instanceof Reference && value.protocol === 'protobuf') {
      // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
      return encodeReference(value);
    }
    if (value instanceof AutomergeArray || Array.isArray(value)) {
      const values: any = value.map((val) => {
        if (val instanceof AutomergeArray || Array.isArray(val)) {
          // TODO(mykola): Add support for nested arrays.
          throw new Error('Nested arrays are not supported');
        }
        return this._encode(val);
      });
      return values;
    }
    if (typeof value === 'object' && value !== null) {
      Object.freeze(value);
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this._encode(value)]));
    }

    if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
      return new automerge.RawString(value);
    }

    return value;
  }

  /**
   * @internal
   */
  _decode(value: any): any {
    if (value === null) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.map((val) => this._decode(val));
    }
    if (value instanceof automerge.RawString) {
      return value.toString();
    }
    if (typeof value === 'object' && value !== null && value['@type'] === REFERENCE_TYPE_TAG) {
      if (value.protocol === 'protobuf') {
        // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
        return decodeReference(value);
      }

      const reference = decodeReference(value);
      return this._lookupLink(reference);
    }
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this._decode(value)]));
    }

    return value;
  }

  private _getDoc(): Doc<any> {
    return this._doc ?? this._docHandle?.docSync() ?? failedInvariant();
  }

  /**
   * Store referenced object.
   * @internal
   */
  _linkObject(obj: EchoObject): Reference {
    if (this._database) {
      if (!obj[base]._database) {
        this._database.add(obj);
        return new Reference(obj.id);
      } else {
        if ((obj[base]._database as any) !== this._database) {
          return new Reference(obj.id, undefined, obj[base]._database.spaceKey.toHex());
        } else {
          return new Reference(obj.id);
        }
      }
    } else {
      invariant(this._linkCache);
      this._linkCache.set(obj.id, obj);
      return new Reference(obj.id);
    }
  }

  /**
   * Lookup referenced object.
   * @internal
   */
  _lookupLink(ref: Reference): EchoObject | undefined {
    if (this._database) {
      // This doesn't clean-up properly if the ref at key gets changed, but it doesn't matter since `_onLinkResolved` is idempotent.
      return this._database.graph._lookupLink(ref, this._database, this._onLinkResolved);
    } else {
      invariant(this._linkCache);
      return this._linkCache.get(ref.itemId);
    }
  }

  // TODO(mykola): Do we need this?
  private _onLinkResolved = () => {
    this._signal.notifyWrite();
    this._updates.emit();
  };

  /**
   * Notifies listeners and front-end framework about the change.
   */
  // TODO(mykola): Unify usage of `_notifyUpdate`.
  private _notifyUpdate = () => {
    try {
      this._signal.notifyWrite();
      this._updates.emit();
    } catch (err) {
      log.catch(err);
    }
  };

  /**
   * @internal
   */
  // TODO(dmaretskyi): Make public.
  _getType() {
    return this.__system.type;
  }

  private _getSchema(): Schema | undefined {
    if (!this._schema && this._database) {
      const type = this.__system.type;
      if (type) {
        this._schema = this._database._resolveSchema(type);
      }
    }
    return this._schema;
  }

  /**
   * @internal
   */
  _getRawDoc(path?: string[]): DocAccessor {
    const self = this;
    return {
      handle: {
        docSync: () => this._getDoc(),
        change: (callback, options) => {
          if (this._doc) {
            if (options) {
              this._doc = automerge.change(this._doc!, options, callback);
            } else {
              this._doc = automerge.change(this._doc!, callback);
            }
            this._notifyUpdate();
          } else {
            invariant(this._docHandle);
            this._docHandle.change(callback, options);
            // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
          }
        },
        changeAt: (heads, callback, options) => {
          let result: Heads | undefined;
          if (this._doc) {
            if (options) {
              const { newDoc, newHeads } = automerge.changeAt(this._doc!, heads, options, callback);
              this._doc = newDoc;
              result = newHeads ?? undefined;
            } else {
              const { newDoc, newHeads } = automerge.changeAt(this._doc!, heads, callback);
              this._doc = newDoc;
              result = newHeads ?? undefined;
            }
            this._notifyUpdate();
          } else {
            invariant(this._docHandle);
            result = this._docHandle.changeAt(heads, callback, options);
            // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
          }

          return result;
        },
        addListener: (event, listener) => {
          if (event === 'change') {
            this[base]._docHandle?.on('change', listener);
            this._updates.on(listener);
          }
        },
        removeListener: (event, listener) => {
          if (event === 'change') {
            this[base]._docHandle?.off('change', listener);
            this._updates.off(listener);
          }
        },
      },
      get path() {
        return [...self._path, 'data', ...(path ?? [])];
      },

      isAutomergeDocAccessor: true,
    };
  }
}

const isValidKey = (key: string | symbol) => {
  return !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'toJSON' ||
    key === 'id' ||
    key === '_id' ||
    key === '__meta' ||
    key === '__schema' ||
    key === '__typename' ||
    key === '__deleted'
  );
};

const encodeReference = (reference: Reference) => ({
  '@type': REFERENCE_TYPE_TAG,
  // NOTE: Automerge do not support undefined values, so we need to use null instead.
  itemId: reference.itemId ?? null,
  protocol: reference.protocol ?? null,
  host: reference.host ?? null,
});

const decodeReference = (value: any) =>
  new Reference(value.itemId, value.protocol ?? undefined, value.host ?? undefined);

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

export const objectIsUpdated = (objId: string, event: DocHandleChangePayload<DocStructure>) => {
  if (event.patches.some((patch) => patch.path[0] === 'objects' && patch.path[1] === objId)) {
    return true;
  }
  return false;
};

// Deferred import to avoid circular dependency.
let schemaProto: typeof Schema;
const getSchemaProto = (): typeof Schema => {
  if (!schemaProto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Schema } = require('../proto');
    schemaProto = Schema;
  }

  return schemaProto;
};

export type IDocHandle<T = any> = {
  docSync(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): string[] | undefined;

  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
};

export type DocAccessor<T = any> = {
  handle: IDocHandle<T>;

  path: string[];

  isAutomergeDocAccessor: true;
};

export const isDocAccessor = (obj: any): obj is DocAccessor => {
  return !!obj?.isAutomergeDocAccessor;
};

export const getRawDoc = (obj: EchoObject, path?: string[]): DocAccessor => {
  invariant(isAutomergeObject(obj));
  return obj[base]._getRawDoc(path);
};
