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
import { TextObject } from './text-object';
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

export type ConvertVisitors = {
  onRef?: (id: string, obj?: EchoObject) => any;
};

export const DEFAULT_VISITORS: ConvertVisitors = {
  onRef: (id, obj) => {
    if (obj instanceof TextObject) {
      return obj.toString();
    } else {
      return { '@id': id };
    }
  }
};

/**
 * Base class for generated document types and dynamic objects.
 *
 * NOTE: See exported `Document` declaration below.
 */
// TODO(burdon): Support immutable objects?
class Document_<T> extends EchoObject<DocumentModel> {
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
          this._set(field.name, new TextObject());
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

    if (value instanceof EchoObject) {
      this._mutate(this._model.builder().set(key, new Reference(value.id)).build());
      this._linkObject(value);
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
      this._mutate(this._model.builder().set(key, OrderedArray.fromValues(values)).build());
      value._attach(this[base], key);
    } else if (Array.isArray(value)) {
      // TODO(dmaretskyi): Make a single mutation.
      this._mutate(this._model.builder().set(key, OrderedArray.fromValues([])).build());
      this._get(key).push(...value);
    } else if (typeof value === 'object' && value !== null) {
      if (Object.getOwnPropertyNames(value).length === 1 && value['@id']) {
        // Special case for assigning unresolved references in the form of { '@id': '0x123' }
        this._mutate(this._model.builder().set(key, new Reference(value['@id'])).build());
      } else {
        const sub = this._createProxy({}, key);
        for (const [subKey, subValue] of Object.entries(value)) {
          sub[subKey] = subValue;
        }
      }
    } else {
      this._mutate(this._model.builder().set(key, value).build());
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

  /**
   * Called after object is bound to a database.
   * `this._item` will now be set to an item tracked by ECHO.
   * @internal
   */
  protected override async _onBind() {
    assert(this._linkCache);

    const promises = [];
    for (const obj of this._linkCache.values()) {
      promises.push(this._database!.add(obj));
    }
    this._linkCache = undefined;

    await Promise.all(promises);
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
Object.defineProperty(Document_, 'name', { value: 'Document' });

/**
 * Helper type to disable type inference for a generic parameter.
 * @see https://stackoverflow.com/a/56688073
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

// NOTE:
// We define the exported value separately to have fine-grained control over the typescript type.
// Runtime semantics should be exactly the same as this compiled down to `export const Document = Document_`.

/**
 * Base class for generated document types and dynamic objects.
 */
export type Document<T extends Record<string, any> = { [key: string]: any }> = Document_<T> & T;

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
} = Document_ as any;

export const isDocument = (object: unknown): object is Document =>
  typeof object === 'object' && object !== null && !!(object as any)[base];