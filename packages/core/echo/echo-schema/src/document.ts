//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { InspectOptionsStylized, inspect } from 'node:util';

import { DocumentModel, OrderedArray, Reference } from '@dxos/document-model';

import { base, data, proxy, schema, type } from './defs';
import { EchoArray } from './echo-array';
import { EchoObject } from './object';
import { EchoSchemaField, EchoSchemaType } from './schema';
import { isReferenceLike } from './util';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'toJSON' ||
    key === 'id'
  );

export type ConvertVisitors = {
  onRef?: (id: string, obj?: EchoObject) => any;
};

export const DEFAULT_VISITORS: ConvertVisitors = {
  onRef: (id, obj) => ({ '@id': id })
};

/**
 * Base class for generated document types and dynamic objects.
 */
// TODO(burdon): Support immutable objects?
export class DocumentBase extends EchoObject<DocumentModel> {
  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   */
  private _linkCache? = new Map<string, EchoObject>();

  // prettier-ignore
  constructor(
    initialProps?: Record<keyof any, any>,
    private readonly _schemaType?: EchoSchemaType
  ) {
    super(DocumentModel);

    if (this._schemaType) {
      // Set type.
      this._mutate({ type: this._schemaType.name });

      for (const field of this._schemaType.fields) {
        if (field.type.kind === 'array') {
          this._set(field.name, new EchoArray());
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

  get [type](): string | null {
    return this[base]?._schemaType?.name ?? this[base]._model?.type ?? null;
  }

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
      '@type': this[type],
      ...this[base]._convert({
        onRef: (id, obj?) => obj ?? { '@id': id }
      })
    };
  }

  private _convert(visitors: ConvertVisitors = {}) {
    const visitorsWithDefaults = { ...DEFAULT_VISITORS, ...visitors };
    const convert = (value: any): any => {
      if (value instanceof EchoObject) {
        return visitorsWithDefaults.onRef!(value.id, value);
      } else if (value instanceof Reference) {
        return visitorsWithDefaults.onRef!(value.itemId, this._database?.getObjectById(value.itemId));
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
      '@type': this[type],
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

  protected override async _onBind() {
    assert(this._linkCache);

    const promises = [];
    for (const obj of this._linkCache.values()) {
      promises.push(this._database!.save(obj));
    }
    this._linkCache = undefined;

    await Promise.all(promises);
  }

  /**
   * @internal
   * Store referenced object.
   */
  _linkObject(obj: EchoObject) {
    if (this._database) {
      void this._database.save(obj);
    } else {
      assert(this._linkCache);
      this._linkCache.set(obj.id, obj);
    }
  }

  /**
   * @internal
   * Lookup referenced object.
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

/**
 * Documents with dynamic properties.
 * Don't have a schema.
 */
export class Document extends DocumentBase {
  // Property accessor.
  [key: string]: any;
}

export const isDocument = (object: any): object is DocumentBase => !!object[base];
