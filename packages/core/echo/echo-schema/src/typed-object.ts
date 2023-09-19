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
import { base, data, proxy, readOnly, schema } from './defs';
import { EchoObject } from './object';
import { EchoSchemaField, EchoSchemaType } from './schema';
import { Text } from './text-object';
import { isReferenceLike } from './util';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'toJSON' ||
    key === 'id' ||
    key === '__deleted' ||
    key === '__meta' ||
    key === '__schema' ||
    key === '__typename'
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

// TODO(dmaretskyi): Document.
export type ForeignKey = {
  source?: string;
  id?: string;
};

// TODO(dmaretskyi): Document.
export type ObjectMeta = {
  keys: ForeignKey[];
  index?: string;
  schema?: Expando;
};

export type TypedObjectOpts = {
  schema?: EchoSchemaType;
  meta?: ObjectMeta;
  readOnly?: boolean;
};

/**
 * Base class for generated document types and dynamic objects.
 *
 * We define the exported `TypedObject` type separately to have fine-grained control over the typescript type.
 * The runtime semantics should be exactly the same since this compiled down to `export const TypedObject = TypedObjectImpl`.
 */
class TypedObjectImpl<T> extends EchoObject<DocumentModel> {
  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * @internal
   */
  _linkCache: Map<string, EchoObject> | undefined = new Map<string, EchoObject>();

  private _schema?: EchoSchemaType = undefined;

  private _readOnly = false;

  constructor(initialProps?: T, opts?: TypedObjectOpts) {
    super(DocumentModel);

    this._schema = opts?.schema;
    this._readOnly = opts?.readOnly ?? false;

    // Assign initial meta fields.
    this._updateMeta({ keys: [], ...opts?.meta });

    // Assign initial values, those will be overridden by the initialProps and later by the ECHO state when the object is bound to the database.
    if (this.__schema) {
      // Set type.
      this._mutate({ type: this.__schema.name });

      for (const field of this.__schema.fields) {
        if (field.type.kind === 'array') {
          this._set(field.name, new EchoArray());
        } else if (field.type.kind === 'ref' && field.type.modelType === TextModel.meta.type) {
          this._set(field.name, new Text());
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

  get [Symbol.toStringTag]() {
    return this[base]?._schema?.name ?? 'TypedObject';
  }

  // TODO(burdon): Reconcile with meta schema.
  get __schema(): EchoSchemaType | undefined {
    return this[base]._schema;
  }

  /**
   * Returns the schema type descriptor for the object.
   * @deprecated
   */
  // TODO(burdon): Method on TypedObject vs EchoObject?
  get [schema](): EchoSchemaType | undefined {
    return this[base]._schema;
  }

  /**
   * Fully qualified name of the object type for objects created from the schema.
   * @example "example.kai.Task"
   */
  get __typename(): string | undefined {
    return this[base]._schema?.name ?? this[base]._model?.type ?? undefined;
  }

  get __meta(): ObjectMeta {
    return this[base]._createProxy({}, undefined, true);
  }

  /**
   * Returns boolean. If `true`, read only access is activated.
   */
  get [readOnly](): boolean {
    return !!this[base]?._readOnly;
  }

  /** Deletion. */
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

  get [data]() {
    return this[base]._convert({
      onRef: (id, obj?) => obj ?? { '@id': id },
    });
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

    if (value instanceof EchoObject) {
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
      '@type': this.__typename,
      // '@schema': this.__schema,
      '@model': DocumentModel.meta.type,
      '@meta': this._transform(this._getState().meta, visitors),
      ...(this.__deleted ? { '@deleted': this.__deleted } : {}),
      ...this._transform(this._model?.toObject(), visitors),
    };
  }

  [inspect.custom](
    depth: number,
    options: InspectOptionsStylized,
    inspect_: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    return `${this[Symbol.toStringTag]} ${inspect(this[data])}`;
  }

  // get [devtoolsFormatter](): DevtoolsFormatter {
  //   return {
  //     header: () => [
  //       'span',
  //       {},
  //       ['span', {}, `${this[Symbol.toStringTag]}(`],
  //       ['span', {}, this.id],
  //       ['span', {}, ')']
  //     ],
  //     hasBody: () => true,
  //     body: () => {
  //       const json = this.toJSON();
  //       return null
  //     }
  //   };
  // }

  /**
   * @internal
   * @param meta Get from `meta` key-space.
   */
  private _get(key: string, meta?: boolean): any {
    this._signal?.notifyRead();

    let type;
    const value = meta ? this._model.getMeta(key) : this._model.get(key);

    if (!type && this.__schema) {
      const field = this.__schema.fields.find((field) => field.name === key);
      if (field?.type.kind === 'array') {
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
    const state = meta ? this._getState().meta : this._getState();

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
      if (value instanceof EchoObject) {
        this._linkObject(value);
        this._mutate(this._model.builder().set(key, new Reference(value.id)).build(meta));
      } else if (value instanceof EchoArray) {
        const values = value.map((item) => {
          if (item instanceof EchoObject) {
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
        if (this.__schema && !parent && !meta) {
          return this.__schema.fields.map(({ name }: EchoSchemaField) => name) ?? [];
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

        if (this.__schema && !parent && !meta) {
          return !!this.__schema?.fields.find(({ name }: EchoSchemaField) => name === property);
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
        if (this[base]._readOnly && !parent && !meta) {
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
  _linkObject(obj: EchoObject) {
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
export type TypedObject<T extends Record<string, any> = Record<string, any>> = TypedObjectImpl<T> & T;

/**
 * Strongly typed object.
 */
type TypedObjectConstructor = {
  new <T extends Record<string, any> = Record<string, any>>(
    initialProps?: NoInfer<Partial<T>>,
    opts?: TypedObjectOpts,
  ): TypedObject<T>;
};

export const TypedObject: TypedObjectConstructor = TypedObjectImpl as any;

/**
 *
 */
type ExpandoConstructor = {
  new (initialProps?: Record<string, any>, options?: TypedObjectOpts): Expando;
};

export const Expando: ExpandoConstructor = TypedObject;

export type Expando = TypedObject;
