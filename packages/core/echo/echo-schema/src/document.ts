//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect, InspectOptionsStylized } from 'node:util';

import { DocumentModel, OrderedArray, Reference } from '@dxos/document-model';
import { TextModel } from '@dxos/text-model';

import { base, data, proxy, schema } from './defs';
import { EchoArray } from './echo-array';
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
    key === '__typename'
  );

export const isDocument = (object: unknown): object is Document =>
  typeof object === 'object' && object !== null && !!(object as any)[base];

export type ConvertVisitors = {
  onRef?: (id: string, obj?: EchoObject) => any;
};

export const DEFAULT_VISITORS: ConvertVisitors = {
  onRef: (id, obj) => ({ '@id': id })
};

/**
 * Helper type to disable type inference for a generic parameter.
 * @see https://stackoverflow.com/a/56688073
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

/**
 * Base class for generated document types and dynamic objects.
 *
 * We define the exported `Document` type separately to have fine-grained control over the typescript type.
 * The runtime semantics should be exactly the same since this compiled down to `export const Document = TypedDocument`.
 */
class TypedDocument<T> extends EchoObject<DocumentModel> {
  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * @internal
   */
  private _linkCache? = new Map<string, EchoObject>();

  // prettier-ignore
  constructor(
    initialProps?: T,
    private readonly _schemaType?: EchoSchemaType
  ) {
    super(DocumentModel);

    // Assign initial values, those will be overridden by the initialProps and later by the ECHO state when the object is bound to the database.
    if (this._schemaType) {
      // Set type.
      this._mutate({ type: this._schemaType.name });

      for (const field of this._schemaType.fields) {
        if (field.type.kind === 'array') {
          this._set(field.name, new EchoArray());
        } else if (field.type.kind === 'ref' && field.type.modelType === TextModel.meta.type) {
          this._set(field.name, new Text());
        }
      }
    }

    if (initialProps) {
      for (const field in initialProps) {
        this._set(field, initialProps[field]);
      }
    }

    return this._createProxy(this);
  }

  get [Symbol.toStringTag]() {
    return this[base]?._schemaType?.name ?? 'Document';
  }

  /**
   * Fully qualified name of the object type for objects created from the schema.
   * @example "example.kai.Task"
   */
  get __typename(): string | undefined {
    return this[base]?._schemaType?.name ?? this[base]._model?.type ?? undefined;
  }

  /**
   * Returns the schema type descriptor for the object.
   */
  // TODO(burdon): Method on Document vs EchoObject?
  get [schema](): EchoSchemaType | undefined {
    return this[base]?._schemaType;
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
    return {
      '@id': this.id,
      '@type': this.__typename,
      '@model': DocumentModel.meta.type,
      ...this[base]._convert({
        onRef: (id, obj?) => obj ?? { '@id': id }
      })
    };
  }

  /**
   * @internal
   */
  private _convert(visitors: ConvertVisitors = {}) {
    const visitorsWithDefaults = { ...DEFAULT_VISITORS, ...visitors };
    const convert = (value: any): any => {
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
    };

    return {
      '@id': this.id,
      '@type': this.__typename,
      '@model': DocumentModel.meta.type,
      ...convert(this._model?.toObject())
    };
  }

  [inspect.custom](
    depth: number,
    options: InspectOptionsStylized,
    inspect_: (value: any, options?: InspectOptionsStylized) => string
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
   */
  private _get(key: string): any {
    this._database?._logObjectAccess(this);

    let type;
    const value = this._model.get(key);

    if (!type && this._schemaType) {
      const field = this._schemaType.fields.find((field) => field.name === key);
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
        return this._createProxy({}, key);
      case 'array':
        return new EchoArray()._attach(this[base], key);
      default:
        return value;
    }
  }

  /**
   * @internal
   */
  private _set(key: string, value: any) {
    this._database?._logObjectAccess(this);

    this._inBatch(() => {
      if (value instanceof EchoObject) {
        this._linkObject(value);
        this._mutate(this._model.builder().set(key, new Reference(value.id)).build());
      } else if (value instanceof EchoArray) {
        const values = value.map((item) => {
          if (item instanceof EchoObject) {
            this._linkObject(item);
            return new Reference(item.id);
          } else if (isReferenceLike(item)) {
            return new Reference(item['@id']);
          } else {
            const sub = this._createProxy({}, key);
            for (const [subKey, subValue] of Object.entries(value)) {
              sub[subKey] = subValue;
            }
          }
        });
      } else {
        this._mutate(this._model.builder().set(key, value).build());
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
   * @internal
   */
  private _createProxy(object: any, parent?: string): any {
    const getProperty = (property: string) => (parent ? `${parent}.${property}` : property);

    /**
     * Constructor returns a proxy object.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
     */
    return new Proxy(object, {
      ownKeys(target) {
        return target._schemaType?.fields.map(({ name }: EchoSchemaField) => name) ?? [];
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
          configurable: true
        };
      },

      get: (target, property, receiver) => {
        // Enable detection of proxy objects.
        if (property === proxy) {
          return true;
        }

        if (!isValidKey(property)) {
          switch (property) {
            case 'toJSON': {
              return this.toJSON.bind(this);
            }

            default: {
              return Reflect.get(this, property, receiver);
            }
          }
        }

        return this._get(getProperty(property as string));
      },

      set: (target, property, value, receiver) => {
        if (!isValidKey(property)) {
          return Reflect.set(this, property, value, receiver);
        }

        this._set(getProperty(property as string), value);
        return true;
      }
    });
  }

  override _beforeBind() {
    assert(this._linkCache);
    for (const obj of this._linkCache.values()) {
      // TODO(dmaretskyi): Promises should be handled though batches.
      void this._database!.add(obj);
    }
    this._linkCache = undefined;
  }

  /**
   * Store referenced object.
   * @internal
   */
  _linkObject(obj: EchoObject) {
    if (this._database) {
      void this._database.add(obj);
    } else {
      assert(this._linkCache);
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
      assert(this._linkCache);
      return this._linkCache.get(id);
    }
  }
}

// Fix constructor name.
Object.defineProperty(TypedDocument, 'name', { value: 'Document' });

/**
 * Base class for generated document types and dynamic objects.
 */
// TODO(burdon): Must rename this (too many collisions).
export type Document<T extends Record<string, any> = { [key: string]: any }> = TypedDocument<T> & T;

// TODO(burdon): Support immutable objects?
export const Document: {
  /**
   * Create a new document.
   * @param initialProps Initial properties.
   * @param _schemaType Schema type for generated types.
   */
  new <T extends Record<string, any> = { [key: string]: any }>(
    initialProps?: NoInfer<Partial<T>>,
    _schemaType?: EchoSchemaType
  ): Document<T>;
} = TypedDocument as any;
