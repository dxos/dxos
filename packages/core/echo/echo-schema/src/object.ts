//
// Copyright 2022 DXOS.org
//

import { Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';

import { EchoDatabase } from './database';
import { id, db, unproxy } from './defs';
import { OrderedSet } from './ordered-set';
import { EchoSchemaField, EchoSchemaType } from './schema';
import { strip } from './util';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    // TODO(burdon): Add 'id' (need to prohibit from schema fields).
    key === 'toJSON'
  );

/**
 * Base class for objects.
 */
// TODO(burdon): Support immutable objects?
export class EchoObjectBase {
  /**
   * Pending values before commited to model.
   * @internal
   */
  private _uninitialized?: Record<keyof any, any> = {};

  /**
   * Maybe not be present for freshly created objects.
   * @internal
   */
  public _id = PublicKey.random().toHex();

  /**
   * Maybe not be present for freshly created objects.
   * @internal
   */
  // TODO(burdon): Maybe not?
  public _item?: Item<ObjectModel>;

  /**
   * Maybe not be present for freshly created objects.
   * @internal
   */
  public _database?: EchoDatabase;

  /**
   * @internal
   */
  public _isBound = false;

  // ID accessor.
  [id]: string = this._id;

  // Database property.
  [db]: EchoDatabase | undefined = this._database;

  // Proxy object.
  [unproxy]: EchoObject = this;

  // prettier-ignore
  constructor(
    initialProps?: Record<keyof any, any>,
    private readonly _schemaType?: EchoSchemaType
  ) {
    Object.assign(this._uninitialized!, initialProps);

    if (this._schemaType) {
      for (const field of this._schemaType.fields) {
        if (field.isOrderedSet && !this._uninitialized![field.name]) {
          this._uninitialized![field.name] = new OrderedSet();
        }
      }
    }

    return this._createProxy(this);
  }

  // TODO(burdon): Document.
  get [Symbol.toStringTag]() {
    return this[unproxy]?._schemaType?.name ?? 'EchoObject';
  }

  /**
   * Convert to JSON object. Used by `JSON.stringify`.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON() {
    return this._json(new Set());
  }

  // TODO(burdon): Option to reference objects by ID, and/or specify depth.
  _json(visited: Set<EchoObjectBase>) {
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
              if (item instanceof EchoObjectBase) {
                if (!visited.has(item)) {
                  visited.add(value);
                  values.push(item[unproxy]._json(visited));
                } else {
                  values.push(strip({ id: item[id] })); // TODO(burdon): Undefined if not saved.
                }
              } else {
                values.push(item);
              }
            }

            result[name] = values;
          }
        } else {
          if (value instanceof EchoObjectBase) {
            // Detect cycles.
            if (!visited.has(value)) {
              visited.add(value);
              result[name] = value[unproxy]._json(visited);
            }
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
      return this._getModelProp(key);
    }
  }

  private _set(key: string, value: any) {
    if (!this._item) {
      this._uninitialized![key] = value;
    } else {
      this._setModelProp(key, value);
    }
  }

  private _getModelProp(prop: string): any {
    let type = this._item!.model.get(`${prop}$type`);
    const value = this._item!.model.get(prop);

    if (!type && this._schemaType) {
      const field = this._schemaType.fields.find((field) => field.name === prop);
      if (field?.isOrderedSet) {
        type = 'array';
      }
    }

    switch (type) {
      case 'ref':
        return this._database!.getObjectById(value);
      case 'object':
        return this._createProxy({}, prop);
      case 'array':
        return new OrderedSet()._bind(this[unproxy], prop);
      default:
        return value;
    }
  }

  private _setModelProp(prop: string, value: any): any {
    if (value instanceof EchoObjectBase) {
      void this._item!.model.set(`${prop}$type`, 'ref'); // TODO(burdon): Async.
      void this._item!.model.set(prop, value[unproxy]._id);
      void this._database!.save(value);
    } else if (value instanceof OrderedSet) {
      void this._item!.model.set(`${prop}$type`, 'array');
      value._bind(this[unproxy], prop);
    } else if (typeof value === 'object' && value !== null) {
      void this._item!.model.set(`${prop}$type`, 'object');
      const sub = this._createProxy({}, prop);
      for (const [subKey, subValue] of Object.entries(value)) {
        sub[subKey] = subValue;
      }
    } else {
      void this._item!.model.set(`${prop}$type`, 'primitive');
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

  /**
   * @internal
   */
  // TODO(burdon): Document.
  _bind(item: Item<ObjectModel>, database: EchoDatabase) {
    this._item = item;
    this._database = database;

    for (const [key, value] of Object.entries(this._uninitialized!)) {
      this._setModelProp(key, value);
    }

    this._uninitialized = undefined;
  }
}

/**
 * Base class for generated types.
 */
export class EchoObject extends EchoObjectBase {
  // Property accessor.
  [key: string]: any;
}
