//
// Copyright 2022 DXOS.org
//

import { ObjectModel, OrderedArray, Reference } from '@dxos/object-model';

import { base, deleted, id } from './defs';
import { EchoArray } from './echo-array';
import { EchoObject } from './object';
import { EchoSchemaField, EchoSchemaType } from './schema';
import { strip } from './util';

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

/**
 * Base class for generated document types and dynamic objects.
 */
// TODO(burdon): Support immutable objects?
export class DocumentBase extends EchoObject<ObjectModel> {
  /**
   * Pending values before committed to model.
   * @internal
   */
  _uninitialized?: Record<keyof any, any> = {};

  override _modelConstructor = ObjectModel;

  // prettier-ignore
  constructor(
    initialProps?: Record<keyof any, any>,
    private readonly _schemaType?: EchoSchemaType
  ) {
    super();
    Object.assign(this._uninitialized!, initialProps);

    if (this._schemaType) {
      for (const field of this._schemaType.fields) {
        if (field.isOrderedSet && !this._uninitialized![field.name]) {
          this._uninitialized![field.name] = new EchoArray();
        }
      }
    }

    return this._createProxy(this);
  }

  get [Symbol.toStringTag]() {
    return this[base]?._schemaType?.name ?? 'Document';
  }

  /** Deletion. */
  get [deleted](): boolean {
    return this[base]._get(DELETED) ?? false;
  }

  /**
   * Convert to JSON object. Used by `JSON.stringify`.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON() {
    return this._json(new Set());
  }

  // TODO(burdon): Option to reference objects by ID, and/or specify depth.
  _json(visited: Set<DocumentBase>) {
    // TODO(burdon): Important: do breadth first recursion to stabilize cycle detection/depth.
    return this._schemaType?.fields.reduce((result: any, { name, isOrderedSet }) => {
      const value = this._get(name);
      if (value !== undefined) {
        // TODO(burdon): Handle ordered sets and other types (change field to type).
        if (isOrderedSet) {
          // TODO(burdon): Check if undefined; otherwise don't add if length 0.
          if (value.length) {
            const values: any[] = [];
            for (let i = 0; i < value.length; i++) {
              const item = value[i];
              if (item instanceof DocumentBase) {
                // if (visited.has(item)) {
                values.push(strip({ id: item[id] })); // TODO(burdon): Option to reify object.1
                // } else {
                //   visited.add(value);
                //   values.push(item[object]._json(visited));
                // }
              } else {
                values.push(item);
              }
            }

            result[name] = values;
          }
        } else {
          if (value instanceof DocumentBase) {
            // Detect cycles.
            // if (!visited.has(value)) {
            result[name] = { id: value[id] };
            // } else {
            //   visited.add(value);
            //   result[name] = value[object]._json(visited);
            // }
          } else {
            result[name] = value;
          }
        }
      }

      return result;
    }, {});
  }

  private _get(key: string) {
    if (!this._item) {
      return this._uninitialized![key];
    } else {
      this._database?._logObjectAccess(this);
      return this._getModelProp(key);
    }
  }

  private _set(key: string, value: any) {
    if (!this._item) {
      this._uninitialized![key] = value;
    } else {
      this._database?._logObjectAccess(this);
      this._setModelProp(key, value);
    }
  }

  private _getModelProp(prop: string): any {
    let type;
    const value = this._item!.model.get(prop);

    if (!type && this._schemaType) {
      const field = this._schemaType.fields.find((field) => field.name === prop);
      if (field?.isOrderedSet) {
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

  private _setModelProp(prop: string, value: any): any {
    if (value instanceof EchoObject) {
      void this._item!.model.set(prop, new Reference(value[id]));
      void this._database!.save(value);
    } else if (value instanceof EchoArray) {
      value._bind(this[base], prop);
    } else if (Array.isArray(value)) {
      void this._item!.model.set(prop, OrderedArray.fromValues(value));
    } else if (typeof value === 'object' && value !== null) {
      const sub = this._createProxy({}, prop);
      for (const [subKey, subValue] of Object.entries(value)) {
        sub[subKey] = subValue;
      }
    } else {
      void this._item!.model.set(prop, value);
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

  protected override _onBind(): void {
    for (const [key, value] of Object.entries(this._uninitialized!)) {
      this._setModelProp(key, value);
    }

    this._uninitialized = undefined;
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
