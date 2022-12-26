//
// Copyright 2022 DXOS.org
//

import { Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';

import { unproxy } from './common';
import { EchoDatabase } from './database';
import { OrderedSet } from './ordered-array';
import { EchoSchemaType } from './schema';

const isValidKey = (key: string | symbol) =>
  !(
    typeof key === 'symbol' ||
    key.startsWith('@@__') ||
    key === 'constructor' ||
    key === '$$typeof' ||
    key === 'toString' ||
    key === 'json'
  );

export const id = (object: EchoObjectBase) => object[unproxy]._id;

/**
 * @deprecated Not safe. Maybe return undefined for freshly created objects.
 */
export const db = (object: EchoObjectBase) => object[unproxy]._database!;

// TODO(burdon): Expose schema.
// TODO(burdon): Codegen should define function with getter access.
export const json = (object: EchoObjectBase) => object[unproxy].json();

/**
 *
 */
// TODO(burdon): Support immutable objects.
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
  public _id!: string;

  /**
   * Maybe not be present for freshly created objects.
   * @internal
   */
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

  [unproxy]: EchoObject = this;

  // prettier-ignore
  constructor(
    initialProps?: Record<keyof any, any>,
    private readonly _schemaType?: EchoSchemaType
  ) {
    this._id = PublicKey.random().toHex();
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
   * Convert to JSON object.
   */
  json() {
    return this._schemaType?.fields.reduce((result: any, { name, isOrderedSet }) => {
      // TODO(burdon): Detect cycles.
      // TODO(burdon): Handle ordered sets and other types (change field to type).
      if (!isOrderedSet) {
        const value = this._get(name);
        if (value !== undefined) {
          if (value instanceof EchoObjectBase) {
            result[name] = value[unproxy].json();
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
        return target._schemaType?.fields.map(({ name }) => name) ?? [];
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
            case 'json': {
              return this.json.bind(this);
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
