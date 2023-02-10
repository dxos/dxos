//
// Copyright 2022 DXOS.org
//

import { InspectOptionsStylized, inspect } from 'node:util';

import { DocumentModel, OrderedArray, Reference } from '@dxos/document-model';
import { createModelMutation, encodeModelMutation } from '@dxos/echo-db';
import { log } from '@dxos/log';

import { base, data, deleted, id, proxy, schema, type } from './defs';
import { EchoArray } from './echo-array';
import { EchoObject } from './object';
import { EchoSchemaField, EchoSchemaType } from './schema';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'toJSON'
  );

// TODO(burdon): Change to underlying item.deleted property.
export const DELETED = '__deleted';

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
   * Pending values before committed to model.
   * @internal
   */
  _uninitialized?: Record<keyof any, any> = {};

  override _modelConstructor = DocumentModel;

  // prettier-ignore
  constructor(
    initialProps?: Record<keyof any, any>,
    private readonly _schemaType?: EchoSchemaType
  ) {
    super();
    Object.assign(this._uninitialized!, initialProps);

    if (this._schemaType) {
      for (const field of this._schemaType.fields) {
        if (field.type.kind === 'array' && !this._uninitialized![field.name]) {
          this._uninitialized![field.name] = new EchoArray();
        }
      }
    }

    return this._createProxy(this);
  }

  get [Symbol.toStringTag]() {
    return this[base]?._schemaType?.name ?? 'Document';
  }

  get [type](): string | null {
    return this[base]?._schemaType?.name ?? this[base]._get('@type') ?? null;
  }

  // TODO(burdon): Method on Document vs EchoObject?
  get [schema](): EchoSchemaType | undefined {
    return this[base]?._schemaType;
  }

  /** Deletion. */
  // TODO(burdon): Move to base.
  get [deleted](): boolean {
    return this[base]._get(DELETED) ?? false;
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
      '@id': this[id],
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
        return visitorsWithDefaults.onRef!(value[id], value);
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

    if (this._uninitialized) {
      return {
        '@id': this[id],
        '@type': this[type],
        ...convert(this._uninitialized)
      };
    } else {
      return {
        '@id': this[id],
        '@type': this[type],
        ...convert(this._model?.toObject())
      };
    }
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
  //       ['span', {}, this[id]],
  //       ['span', {}, ')']
  //     ],
  //     hasBody: () => true,
  //     body: () => {
  //       const json = this.toJSON();
  //       return null
  //     }
  //   };
  // }

  private _get(key: string) {
    this._database?._logObjectAccess(this);

    if (!this._item) {
      return this._uninitialized![key];
    } else {
      return this._getModelProp(key);
    }
  }

  private _set(key: string, value: any) {
    this._database?._logObjectAccess(this);

    if (!this._item) {
      this._uninitialized![key] = value;
    } else {
      this._setModelProp(key, value).catch((err) => log.catch(err));
    }
  }

  private _getModelProp(prop: string): any {
    let type;
    const value = this._model!.get(prop);

    if (!type && this._schemaType) {
      const field = this._schemaType.fields.find((field) => field.name === prop);
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
        return this._database!.getObjectById((value as Reference).itemId);
      case 'object':
        return this._createProxy({}, prop);
      case 'array':
        return new EchoArray()._bind(this[base], prop);
      default:
        return value;
    }
  }

  private async _setModelProp(prop: string, value: any) {
    if (value instanceof EchoObject) {
      this._database?._backend.mutate(
        createModelMutation(
          this[id],
          encodeModelMutation(
            this._model!.modelMeta,
            this._model!.builder().set(prop, new Reference(value[id])).build()
          )
        )
      );
      await this._database!.save(value);
    } else if (value instanceof EchoArray) {
      value._bind(this[base], prop);
    } else if (Array.isArray(value)) {
      this._database?._backend.mutate(
        createModelMutation(
          this[id],
          encodeModelMutation(
            this._model!.modelMeta,
            this._model!.builder().set(prop, OrderedArray.fromValues([])).build()
          )
        )
      );
      this._getModelProp(prop).push(...value);
    } else if (typeof value === 'object' && value !== null) {
      if (Object.getOwnPropertyNames(value).length === 1 && value['@id']) {
        // Special case for assigning unresolved references in the form of { '@id': '0x123' }
        this._database?._backend.mutate(
          createModelMutation(
            this[id],
            encodeModelMutation(
              this._model!.modelMeta,
              this._model!.builder().set(prop, new Reference(value['@id'])).build()
            )
          )
        );
      } else {
        const sub = this._createProxy({}, prop);
        for (const [subKey, subValue] of Object.entries(value)) {
          sub[subKey] = subValue;
        }
      }
    } else {
      this._database?._backend.mutate(
        createModelMutation(
          this[id],
          encodeModelMutation(this._model!.modelMeta, this._model!.builder().set(prop, value).build())
        )
      );
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
              return Reflect.get(target, property, receiver);
            }
          }
        }

        return this._get(getProperty(property as string));
      },

      set: (target, property, value, receiver) => {
        if (!isValidKey(property)) {
          return Reflect.set(target, property, value, receiver);
        }

        this._set(getProperty(property as string), value);
        return true;
      }
    });
  }

  protected override async _onBind() {
    const promises = [];
    for (const [key, value] of Object.entries(this._uninitialized!)) {
      promises.push(this._setModelProp(key, value));
    }

    this._uninitialized = undefined;

    await Promise.all(promises);
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
