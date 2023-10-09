//
// Copyright 2022 DXOS.org
//

import get from 'lodash.get';
import { inspect, InspectOptionsStylized } from 'node:util';

import { DocumentModel, OrderedArray, Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TextModel } from '@dxos/text-model';

import { EchoArray } from './array';
import { base, data, proxy, immutable, schema, meta, ObjectMeta, TypedObjectProperties, EchoObject } from './defs';
import { EchoObjectBase } from './echo-object-base';
import { Schema } from './proto'; // NOTE: Keep as type-import.
import type { EchoSchemaType } from './schema'; // NOTE: Keep as type-import.
import { Text } from './text-object';
import { isReferenceLike } from './util';
import { DevtoolsFormatter, devtoolsFormatter, JsonML } from '@dxos/debug';
import { getBody, getHeader } from './devtools-formatter';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'toJSON' ||
    key === 'id' ||
    key === '__meta' ||
    key === '__schema' ||
    key === '__typename' || // TODO(burdon): Reconcile with schema name.
    key === '__deleted'
  );

export const isTypedObject = (object: unknown): object is TypedObject =>
  typeof object === 'object' && object !== null && !!(object as any)[base];

export type ConvertVisitors = {
  onRef?: (id: string, obj?: EchoObject) => any;
};

export const DEFAULT_VISITORS: ConvertVisitors = {
  onRef: (id, obj) => ({ '@id': id }),
};

/**
 * Helper type to disable type inference for a generic parameter.
 * @see https://stackoverflow.com/a/56688073
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

//
// TypedObject
// Generic base class for strongly-typed schema-generated classes.
//


export type TypedObjectOptions = {
  schema?: Schema;
  meta?: ObjectMeta;
  immutable?: boolean;
};

/**
 * Base class for generated document types and dynamic objects.
 *
 * We define the exported `TypedObject` type separately to have fine-grained control over the typescript type.
 * The runtime semantics should be exactly the same since this compiled down to `export const TypedObject = TypedObjectImpl`.
 */
// TODO(burdon): Extract interface.
class TypedObjectImpl<T> extends EchoObjectBase<DocumentModel> implements TypedObjectProperties {
  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * @internal
   */
  _linkCache: Map<string, EchoObject> | undefined = new Map<string, EchoObject>();

  private readonly _schema?: Schema = undefined;
  private readonly _immutable;

  constructor(initialProps?: T, opts?: TypedObjectOptions) {
    super(DocumentModel);

    this._schema = opts?.schema;
    this._immutable = opts?.immutable ?? false;

    // Assign initial meta fields.
    this._updateMeta({ keys: [], ...opts?.meta });

    // Assign initial values, those will be overridden by the initialProps and later by the ECHO state when the object is bound to the database.
    if (this._schema) {
      this._mutate({ typeRef: new Reference(this._schema!.id) });
      for(const field of this._schema.props) {
        if(field.repeated) {
          this._set(field.id!, new EchoArray());
        } else if(field.type === getSchemaProto().PropType.REF && field.refModelType === TextModel.meta.type) {
          this._set(field.id!, new Text());
        }
      }
    }

    if (initialProps) {
      for (const field in initialProps) {
        const value = initialProps[field];
        if (value !== undefined) {
          this._set(field, value);
        }
      }
    }

    return this._createProxy(this);
  }

  [inspect.custom](
    depth: number,
    options: InspectOptionsStylized,
    inspect_: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    return `${this[Symbol.toStringTag]} ${inspect(this[data])}`;
  }

  [devtoolsFormatter]: DevtoolsFormatter = {
    header: (config?: any) => getHeader(this, config),
    hasBody: () => true,
    body: () => getBody(this),
  };

  get [Symbol.toStringTag]() {
    return this._schema?.typename ?? 'Expando';
  }

  /**
   * Returns the schema type descriptor for the object.
   * @deprecated Use `__schema` instead.
   */
  get [schema](): Schema | undefined {
    return this[base]._schema;
  }

  get [meta](): ObjectMeta {
    return this[base]._createProxy({}, undefined, true);
  }

  get [data](): any {
    return this[base]._convert({
      onRef: (id, obj) => obj ?? { '@id': id },
    });
  }

  get [immutable](): boolean {
    return !!this[base]?._immutable;
  }

  get __schema(): Schema | undefined {
    return this[base]._schema;
  }

  /**
   * Fully qualified name of the object type for objects created from the schema.
   */
  get __typename(): string | undefined {
    return this.__schema?.typename;
  }

  get __meta(): ObjectMeta {
    return this[meta];
  }

  get __deleted(): boolean {
    return this[base]._item?.deleted ?? false;
  }

  /**
   * Convert to JSON object. Used by `JSON.stringify`.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON() {
    return this[base]._convert();
  }

  /**
   * Convenience method to set meta fields.
   *
   * @example
   * ```ts
   * space.db.add(new Expando().setMeta({ keys: [{ source: 'example.com' }] }));
   * ```
   */
  private _updateMeta(meta: Partial<ObjectMeta>): this {
    this[base]._inBatch(() => {
      for (const key in meta) {
        this.__meta[key as keyof ObjectMeta] = meta[key as keyof ObjectMeta] as any;
      }
    });

    return this;
  }

  /**
   * @internal
   */
  override _itemUpdate(): void {
    super._itemUpdate();
    this._signal?.notifyWrite();
  }

  private _transform(value: any, visitors: ConvertVisitors = {}) {
    const visitorsWithDefaults = { ...DEFAULT_VISITORS, ...visitors };
    const convert = (value: any): any => this._transform(value, visitorsWithDefaults);

    if (value instanceof EchoObjectBase) {
      return visitorsWithDefaults.onRef!(value.id, value);
    } else if (value instanceof Reference) {
      return visitorsWithDefaults.onRef!(value.itemId, this._lookupLink(value.itemId));
    } else if (value instanceof OrderedArray) {
      return value.toArray().map(convert);
    } else if (value instanceof EchoArray) {
      return value.map(convert);
    } else if (Array.isArray(value)) {
      return value.map(convert);
    } else if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const key of Object.keys(value)) {
        result[key] = convert(value[key]);
      }
      return result;
    } else {
      return value;
    }
  }

  /**
   * @internal
   */
  private _convert(visitors: ConvertVisitors = {}) {
    return {
      '@id': this.id,
      '@type': this.__typename ?? (isRuntimeSchema(this._schema) ? { '@id': this._schema!.id } : undefined),
      // '@schema': this.__schema,
      '@model': DocumentModel.meta.type,
      '@meta': this._transform(this._getState().meta, visitors),
      ...(this.__deleted ? { '@deleted': this.__deleted } : {}),
      ...this._transform(this._model?.toObject(), visitors),
    };
  }

  /**
   * @internal
   * @param key
   * @param meta If true then get from `meta` key-space.
   */
  private _get(key: string, meta?: boolean): any {
    this._signal?.notifyRead();

    let type;
    const value = meta ? this._model.getMeta(key) : this._model.get(key);

    if (!type && this._schema) {
      const field = this._schema.props.find((field) => field.id === key);
      if (field?.repeated) {
        type = 'array';
      }
    }

    if (!type && value instanceof OrderedArray) {
      type = 'array';
    }

    if (!type && value instanceof Reference) {
      type = 'ref';
    }

    if (!type && typeof value === 'object' && value !== null) {
      type = 'object';
    }

    switch (type) {
      case 'ref':
        return this._lookupLink((value as Reference).itemId);
      case 'object':
        return this._createProxy({}, key, meta);
      case 'array':
        return new EchoArray()._attach(this[base], key, meta);
      default:
        return value;
    }
  }

  private _properties(key?: string, meta?: boolean) {
    const state = meta ? this._getState().meta : this._getState().data;

    const value = key ? get(state, key) : state;

    if (value instanceof OrderedArray) {
      return [];
    } else if (value instanceof Reference) {
      return [];
    } else if (typeof value === 'object' && value !== null) {
      return Object.keys(value);
    } else {
      return [];
    }
  }

  /**
   * @internal
   */
  private _set(key: string, value: any, meta?: boolean) {
    this._inBatch(() => {
      if (value instanceof EchoObjectBase) {
        this._linkObject(value);
        this._mutate(this._model.builder().set(key, new Reference(value.id)).build(meta));
      } else if (value instanceof EchoArray) {
        const values = value.map((item) => {
          if (item instanceof EchoObjectBase) {
            this._linkObject(item);
            return new Reference(item.id);
          } else if (isReferenceLike(item)) {
            return new Reference(item['@id']);
          } else {
            return item;
          }
        });
        this._mutate(this._model.builder().set(key, OrderedArray.fromValues(values)).build(meta));
        value._attach(this[base], key);
      } else if (Array.isArray(value)) {
        // TODO(dmaretskyi): Make a single mutation.
        this._mutate(this._model.builder().set(key, OrderedArray.fromValues([])).build(meta));
        this._get(key, meta).push(...value);
      } else if (typeof value === 'object' && value !== null) {
        if (Object.getOwnPropertyNames(value).length === 1 && value['@id']) {
          // Special case for assigning unresolved references in the form of { '@id': '0x123' }
          this._mutate(this._model.builder().set(key, new Reference(value['@id'])).build(meta));
        } else {
          const sub = this._createProxy({}, key);
          this._mutate(this._model.builder().set(key, {}).build(meta));
          for (const [subKey, subValue] of Object.entries(value)) {
            sub[subKey] = subValue;
          }
        }
      } else {
        this._mutate(this._model.builder().set(key, value).build(meta));
      }
    });
  }

  private _inBatch(cb: () => void) {
    if (!this._database?._backend) {
      cb();
    } else {
      const batchCreated = this._database._backend.beginBatch();

      try {
        cb();
      } finally {
        if (batchCreated) {
          this._database._backend.commitBatch();
        }
      }
    }
  }

  /**
   * Create proxy for root or sub-object.
   * @param meta If true, create proxy for meta object.
   * @internal
   */
  private _createProxy(object: any, parent?: string, meta?: boolean): any {
    const getProperty = (property: string) => (parent ? `${parent}.${property}` : property);

    /**
     * Constructor returns a proxy object.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
     */
    return new Proxy(object, {
      ownKeys: (target) => {
        if (this._schema && !parent && !meta) {
          return this._schema.props.map(field => field.id!) ?? [];
        } else {
          return this._properties(parent, meta);
        }
      },

      has: (target, property) => {
        if (!isValidKey(property)) {
          if (!parent && !meta) {
            return Reflect.has(this, property);
          } else {
            return Reflect.has(target, property);
          }
        }

        if (typeof property === 'symbol') {
          return false;
        }

        if (this._schema && !parent && !meta) {
          return !!this._schema?.props.find(field => field.id === property);
        } else {
          return this._properties(parent, meta).includes(property);
        }
      },

      /**
       * Called for each property (e.g., called by Object.keys()).
       * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/getOwnPropertyDescriptor
       * See: https://javascript.info/proxy
       */
      getOwnPropertyDescriptor(target, property) {
        // TODO(burdon): Return other properties?
        return {
          enumerable: true,
          configurable: true,
        };
      },

      get: (target, property, receiver) => {
        // Enable detection of proxy objects.
        if (property === proxy) {
          return true;
        }

        if (!isValidKey(property)) {
          if (!parent && !meta) {
            switch (property) {
              case 'toJSON': {
                return this.toJSON.bind(this);
              }

              default: {
                return Reflect.get(this, property, receiver);
              }
            }
          } else {
            return Reflect.get(target, property, receiver);
          }
        }

        return this._get(getProperty(property as string), meta);
      },

      set: (target, property, value, receiver) => {
        if (this[base]._immutable && !mutationOverride && !parent && !meta) {
          log.warn('Read only access');
          return false;
        }
        if (!isValidKey(property)) {
          if (!parent && !meta) {
            return Reflect.set(this, property, value, receiver);
          } else {
            return Reflect.set(target, property, value, receiver);
          }
        }

        this._set(getProperty(property as string), value, meta);
        return true;
      },
    });
  }

  override _beforeBind() {
    invariant(this._linkCache);
    for (const obj of this._linkCache.values()) {
      this._database!.add(obj as TypedObject);
    }
    this._linkCache = undefined;
  }

  /**
   * Store referenced object.
   * @internal
   */
  _linkObject(obj: EchoObjectBase) {
    if (this._database) {
      this._database.add(obj as TypedObject);
    } else {
      invariant(this._linkCache);
      this._linkCache.set(obj.id, obj);
    }
  }

  /**
   * Lookup referenced object.
   * @internal
   */
  _lookupLink(id: string): EchoObject | undefined {
    if (this._database) {
      return this._database.getObjectById(id);
    } else {
      invariant(this._linkCache);
      return this._linkCache.get(id);
    }
  }
}

// Set stringified name for constructor.
Object.defineProperty(TypedObjectImpl, 'name', { value: 'TypedObject' });

/**
 * Base class for generated document types and expando objects.
 */

type TypedObjectConstructor = {
  new <T extends Record<string, any> = Record<string, any>>(
    initialProps?: NoInfer<Partial<T>>,
    opts?: TypedObjectOptions,
  ): TypedObject<T>;
};

export type TypedObject<T extends Record<string, any> = Record<string, any>> = TypedObjectImpl<T> & T;

export const TypedObject: TypedObjectConstructor = TypedObjectImpl as any;

/**
 *
 */
type ExpandoConstructor = {
  new(initialProps?: Record<string, any>, options?: TypedObjectOptions): Expando;
};

export const Expando: ExpandoConstructor = TypedObject;

export type Expando = TypedObject;

const isRuntimeSchema = (schema: EchoSchemaType | Schema | undefined): schema is Schema =>
  !!schema && !!(schema as any)[base];

let mutationOverride = false;

export const dangerouslyMutateImmutableObject = (cb: () => void) => {
  const prev = mutationOverride;
  mutationOverride = true;
  try {
    cb();
  } finally {
    mutationOverride = prev;
  }
}

// Deferred import to avoid circular dependency.
let schemaProto: typeof Schema;
const getSchemaProto = (): typeof Schema => {
  if(!schemaProto) {
    const { Schema } = require('./proto')
    schemaProto = Schema;
  }
  return schemaProto;
}