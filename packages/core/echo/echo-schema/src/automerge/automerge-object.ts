//
// Copyright 2023 DXOS.org
//

import { inspect, type InspectOptionsStylized } from 'node:util';

import { next as A, type ChangeFn, type Doc } from '@dxos/automerge/automerge';
import { Reference } from '@dxos/document-model';
import { failedInvariant, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TextModel } from '@dxos/text-model';

import { type EchoDatabase } from '../database';
import {
  TextObject,
  base,
  data,
  db,
  debug,
  immutable,
  isAutomergeObject,
  mutationOverride,
  proxy,
  subscribe,
  type EchoObject,
  type ObjectMeta,
  type TypedObjectOptions,
  type TypedObjectProperties,
} from '../object';
import { AbstractEchoObject } from '../object/object';
import { type Schema } from '../proto';
import { AutomergeArray } from './automerge-array';
import { AutomergeObjectCore, assignDeep, type BindOptions, type DocAccessor } from './automerge-object-core';
import { REFERENCE_TYPE_TAG, type ObjectStructure, type ObjectSystem } from './types';

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
          : this._core.linkObject(this._schema)
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
    const updatesListener = () => {
      callback(this);
    };

    return this[base]._core.updates.on(updatesListener);
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
      data: this._core.encode(initialProps),
      meta: this._core.encode({
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
    this._core.bind(options);
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

    return this._core.decode(value);
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

    const encoded = this._core.encode(value);

    // Attach array after encoding as attaching array will clear the local state.
    if (value instanceof AutomergeArray) {
      value._attach(this[base], path);
    }

    this._change((doc) => {
      assignDeep(doc, fullPath, encoded);
    });
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
  _getDoc(): Doc<any> {
    invariant(!this[proxy]);
    return this._core.doc ?? this._core.docHandle?.docSync() ?? failedInvariant();
  }

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
