//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { next as automerge, type ChangeFn, type Doc } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Reference } from '@dxos/document-model';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { TextModel } from '@dxos/text-model';

import { AutomergeArray } from './automerge-array';
import { type AutomergeDb } from './automerge-db';
import { type DocStructure, type ObjectSystem } from './types';
import { type EchoDatabase } from '../database';
import { type TypedObjectOptions } from '../object';
import { AbstractEchoObject } from '../object/object';
import {
  type EchoObject,
  type ObjectMeta,
  type TypedObjectProperties,
  base,
  db,
  debug,
  subscribe,
  proxy,
  immutable,
} from '../object/types';
import { type Schema } from '../proto';
import { compositeRuntime } from '../util';

export type BindOptions = {
  db: AutomergeDb;
  docHandle: DocHandle<any>;
  path: string[];
};

export class AutomergeObject implements TypedObjectProperties {
  private _database?: AutomergeDb;
  private _doc?: Doc<any>;
  private _docHandle?: DocHandle<DocStructure>;
  private _schema?: Schema;

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

    // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types. References should not leak outside of the AutomergeObject, It should be internal concept.
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
    let value = this[base]._getDoc();
    for (const key of this[base]._path) {
      value = value?.[key];
    }
    return value;
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
          (initialProps as Record<string, any>)[field.id!] ??= '';
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
    this._database = options.db;
    this._docHandle = options.docHandle;
    this._path = options.path;

    if (this._linkCache) {
      for (const obj of this._linkCache.values()) {
        this._database!.add(obj);
      }

      this._linkCache = undefined;
    }

    if (this._doc) {
      const doc = this._doc;
      this._doc = undefined;
      this._set([], doc);
    }
  }

  private _createProxy(path: string[]): any {
    return new Proxy(this, {
      ownKeys: () => {
        return [];
        // return Object.keys(this._get(path));
      },

      has: (_, key) => {
        return key in this._get(path);
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

        const value = this._get([...path, key as string]);

        if (value instanceof AbstractEchoObject || value instanceof AutomergeObject) {
          return value;
        }
        if (value instanceof Reference && value.protocol === 'protobuf') {
          // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
          return value;
        }
        if (Array.isArray(value)) {
          return new AutomergeArray()._attach(this[base], [...path, key as string]);
        }
        if (typeof value === 'object' && value !== null) {
          return this._createProxy([...path, key as string]);
        }

        return value;
      },

      set: (_, key, value) => {
        this._set([...path, key as string], value);
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
    } else if (this._doc) {
      this._doc = automerge.change(this._doc, changeFn);
    } else {
      failedInvariant();
    }
    this._notifyUpdate();
  }

  /**
   * @internal
   */
  _encode(value: any) {
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
    return value;
  }

  /**
   * @internal
   */
  _decode(value: any): any {
    if (Array.isArray(value)) {
      return value.map((val) => this._decode(val));
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
          return new Reference(obj.id, undefined, obj[base]._database._backend.spaceKey.toHex());
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

  private _notifyUpdate = () => {
    this._signal.notifyWrite();
    this._updates.emit();
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

const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

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
