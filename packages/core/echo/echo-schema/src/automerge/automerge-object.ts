//
// Copyright 2023 DXOS.org
//

import { type InspectOptionsStylized, inspect } from 'node:util';

import { Trigger } from '@dxos/async';
import { next as A, type ChangeFn, type Doc } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Reference } from '@dxos/document-model';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TextModel } from '@dxos/text-model';

import { AutomergeArray } from './automerge-array';
import { type AutomergeDb } from './automerge-db';
import { AutomergeObjectCore, type DocAccessor } from './automerge-object-core';
import { type ObjectStructure, type DocStructure, type ObjectSystem } from './types';
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

// TODO(dmaretskyi): Rename to `AutomergeObjectApi`.
export class AutomergeObject implements TypedObjectProperties {
  /**
   * @internal
   */
  _core = new AutomergeObjectCore();

  private _schema?: Schema = undefined;

  private readonly _immutable: boolean; // TODO(burdon): Not used.

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * @internal
   */
  _linkCache: Map<string, EchoObject> | undefined = new Map<string, EchoObject>();

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

    this._core.onManualChange.on(() => {
      this._notifyUpdate();
    });

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
    return this._core.id;
  }

  get [base](): AutomergeObject {
    return this;
  }

  get [db](): EchoDatabase | undefined {
    return this[base]._core.database?._echoDatabase;
  }

  get [debug](): string {
    return 'automerge';
  }

  get [immutable](): boolean {
    return !!this[base]?._immutable;
  }

  get [proxy](): boolean {
    return false; // true case is handled in the proxy `get` handler.
  }

  get [data](): any {
    let value = this[base]._getDoc();
    for (const key of this[base]._core.mountPath) {
      value = value?.[key];
    }
    const typeRef = this.__system.type;

    return {
      // TODO(mykola): Delete backend (for debug).
      '@backend': 'automerge',
      '@id': this._core.id,
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

  /**
   * @internal
   * @deprecated needed for compatibility with ECHO object
   */
  get _database() {
    return this[base]._core.database;
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
    const changeListener = (event: DocHandleChangePayload<DocStructure>) => {
      if (objectIsUpdated(this[base]._core.id, event)) {
        callback(this);
      }
    };

    const updatesListener = () => {
      callback(this);
    };

    this[base]._core.docHandle?.on('change', changeListener);
    this[base]._core.updates.on(updatesListener);
    return () => {
      this[base]._core.docHandle?.off('change', changeListener);
      this[base]._core.updates.off(updatesListener);
    };
  }

  private _initNewObject(initialProps?: unknown, opts?: TypedObjectOptions) {
    invariant(!this[proxy]);
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

    this._core.doc = A.from<ObjectStructure>({
      data: this._encode(initialProps),
      meta: this._encode({
        keys: [],
        ...opts?.meta,
      }),
      system: {},
    });
  }

  /**
   * @internal
   */
  _bind(options: BindOptions) {
    invariant(!this[proxy]);
    this._core.database = options.db;
    this._core.docHandle = options.docHandle;
    this._core.mountPath = options.path;

    if (this._linkCache) {
      for (const obj of this._linkCache.values()) {
        this._core.database!.add(obj);
      }

      this._linkCache = undefined;
    }

    if (options.ignoreCache) {
      this._core.doc = undefined;
    }

    if (this._core.doc) {
      const doc = this._core.doc;
      this._core.doc = undefined;
      this._set([], doc);
    }

    this._core.docHandle.on('change', (event) => {
      if (objectIsUpdated(this._core.id, event)) {
        // Updates must come in the next microtask since the object state is not fully updated at the time of "change" event processing.
        // Update listeners might access the state of the object and it must be fully updated at that time.
        // It's ok to use `queueMicrotask` here since this path is only used for propagation of remote changes.
        queueMicrotask(() => {
          this._notifyUpdate();
        });
      }
    });
    this._notifyUpdate();
  }

  private _createProxy(path: string[]): any {
    invariant(!this[proxy]);
    return new Proxy(this, {
      // NOTE: Key order is not guaranteed.
      ownKeys: (target) => {
        // TODO(mykola): Add support for expando objects.
        const schema = this.__schema;
        if (schema) {
          return schema.props.map((field) => field.id!);
        } else {
          return Reflect.ownKeys(this._get(path));
        }
      },

      has: (_, key) => {
        if (isRootDataObjectKey(path, key)) {
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

        if (typeof key === 'symbol' || isRootDataObjectKey(path, key)) {
          return Reflect.get(this, key);
        }

        const relativePath = [...path, ...(key as string).split('.')];

        const value = this._get(relativePath);

        return this._mapToEchoObject(relativePath, value);
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
    invariant(!this[proxy]);
    this._core.signal.notifyRead();

    const fullPath = [...this._core.mountPath, ...path];
    let value = this._getDoc();
    for (const key of fullPath) {
      value = value?.[key];
    }

    return this._decode(value);
  }

  _mapToEchoObject(relativePath: string[], value: any) {
    invariant(!this[proxy]);
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
  }

  /**
   * @internal
   */
  _set(path: string[], value: any) {
    invariant(!this[proxy]);
    const fullPath = [...this._core.mountPath, ...path];

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
    invariant(!this[proxy]);
    this._core.change(changeFn);
  }

  /**
   * @internal
   */
  _encode(value: any) {
    invariant(!this[proxy]);
    if (value instanceof A.RawString) {
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
      return new A.RawString(value);
    }

    return value;
  }

  /**
   * @internal
   */
  _decode(value: any): any {
    invariant(!this[proxy]);
    if (value === null) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.map((val) => this._decode(val));
    }
    if (value instanceof A.RawString) {
      return value.toString();
    }
    if (isEncodedReferenceObject(value)) {
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

  /**
   * @internal
   */
  _getDoc(): Doc<any> {
    invariant(!this[proxy]);
    return this._core.doc ?? this._core.docHandle?.docSync() ?? failedInvariant();
  }

  /**
   * Store referenced object.
   * @internal
   */
  _linkObject(obj: EchoObject): Reference {
    invariant(!this[proxy]);
    if (this._core.database) {
      if (!obj[base]._database) {
        this._core.database.add(obj);
        return new Reference(obj.id);
      } else {
        if ((obj[base]._database as any) !== this._core.database) {
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
    invariant(!this[proxy]);
    if (this._core.database) {
      // This doesn't clean-up properly if the ref at key gets changed, but it doesn't matter since `_onLinkResolved` is idempotent.
      return this._core.database.graph._lookupLink(ref, this._core.database, this._onLinkResolved);
    } else {
      invariant(this._linkCache);
      return this._linkCache.get(ref.itemId);
    }
  }

  // TODO(mykola): Do we need this?
  private _onLinkResolved = () => {
    invariant(!this[proxy]);
    this._core.signal.notifyWrite();
    this._core.updates.emit();
  };

  /**
   * Notifies listeners and front-end framework about the change.
   */
  // TODO(mykola): Unify usage of `_notifyUpdate`.
  private _notifyUpdate = () => {
    invariant(!this[proxy]);
    try {
      this._core.signal.notifyWrite();
      this._core.updates.emit();
    } catch (err) {
      log.catch(err);
    }
  };

  /**
   * @internal
   */
  // TODO(dmaretskyi): Make public.
  _getType() {
    invariant(!this[proxy]);
    return this.__system.type;
  }

  private _getSchema(): Schema | undefined {
    invariant(!this[proxy]);
    if (!this._schema && this._core.database) {
      const type = this.__system.type;
      if (type) {
        this._schema = this._core.database._resolveSchema(type);
      }
    }
    return this._schema;
  }

  /**
   * @internal
   */
  _getRawDoc(path?: string[]): DocAccessor {
    invariant(!this[proxy]);
    return this._core.getDocAccessor(path);
  }
}

const isRootDataObjectKey = (relativePath: string[], key: string | symbol) => {
  if (relativePath.length !== 1 || relativePath[0] !== 'data') {
    return false;
  }
  return (
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

type EncodedReferenceObject = {
  '@type': typeof REFERENCE_TYPE_TAG;
  itemId: string | null;
  protocol: string | null;
  host: string | null;
};

const isEncodedReferenceObject = (value: any): value is EncodedReferenceObject =>
  typeof value === 'object' && value !== null && value['@type'] === REFERENCE_TYPE_TAG;

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

export const getRawDoc = (obj: EchoObject, path?: string[]): DocAccessor => {
  invariant(isAutomergeObject(obj));
  return obj[base]._getRawDoc(path);
};
