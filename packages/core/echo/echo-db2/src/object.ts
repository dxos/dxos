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
    key === 'toString'
  );

export const id = (object: EchoObjectBase) => object[unproxy]._id;

/**
 * @deprecated Not safe. Maybe return undefined for freshly created objects.
 */
// TODO(burdon): Remove.
export const db = (object: EchoObjectBase) => object[unproxy]._database!;

/**
 *
 */
// TODO(burdon): Support immutable objects.
export class EchoObjectBase {
  /**
   * @internal
   * Maybe not be present for freshly created objects.
   */
  public _id!: string; // TODO(burdon): Symbol?

  /**
   * @internal
   * Maybe not be present for freshly created objects.
   */
  public _item?: Item<ObjectModel>;

  /**
   * @internal
   * Maybe not be present for freshly created objects.
   */
  public _database?: EchoDatabase;

  /**
   * @internal
   */
  public _isBound = false;

  private _uninitialized?: Record<keyof any, any> = {};

  [unproxy]: EchoObject = this;

  get [Symbol.toStringTag]() {
    return this[unproxy]?._schemaType?.name ?? 'EchoObject';
  }

  constructor(initialProps?: Record<keyof any, any>, private readonly _schemaType?: EchoSchemaType) {
    this._id = PublicKey.random().toHex();
    Object.assign(this._uninitialized!, initialProps);

    if (this._schemaType) {
      for (const field of this._schemaType.fields) {
        if (field.isOrderedSet && !this._uninitialized![field.name]) {
          this._uninitialized![field.name] = new OrderedSet();
        }
      }
    }

    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (!isValidKey(property)) {
          return Reflect.get(target, property, receiver);
        }

        return this._get(property as string);
      },

      set: (target, property, value, receiver) => {
        if (!isValidKey(property)) {
          return Reflect.set(target, property, value, receiver);
        }

        this._set(property as string, value);
        return true;
      }
    });
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
        return this._createSubObject(prop);
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
      const sub = this._createSubObject(prop);
      for (const [subKey, subValue] of Object.entries(value)) {
        sub[subKey] = subValue;
      }
    } else {
      void this._item!.model.set(`${prop}$type`, 'primitive');
      void this._item!.model.set(prop, value);
    }
  }

  private _createSubObject(prop: string): any {
    return new Proxy(
      {},
      {
        get: (target, property, receiver) => {
          if (!isValidKey(property)) {
            return Reflect.get(target, property, receiver);
          }

          return this._get(`${prop}.${String(property)}`);
        },

        set: (target, property, value, receiver) => {
          if (!isValidKey(property)) {
            return Reflect.set(target, property, value, receiver);
          }

          this._set(`${prop}.${String(property)}`, value);
          return true;
        }
      }
    );
  }

  /**
   * @internal
   */
  _bind(item: Item<ObjectModel>, database: EchoDatabase) {
    this._item = item;
    this._database = database;

    for (const [key, value] of Object.entries(this._uninitialized!)) {
      this._setModelProp(key, value);
    }

    this._uninitialized = undefined;
  }
}

export class EchoObject extends EchoObjectBase {
  // Allow to access arbitrary properties via dot notation.
  [key: string]: any;
}
