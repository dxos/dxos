//
// Copyright 2022 DXOS.org
//

import { Item } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';

import { unproxy } from './common';
import { EchoDatabase } from './database';
import { OrderedArray } from './ordered-array';

const isValidKey = (key: string | symbol) =>
  !(typeof key === 'symbol' || key.startsWith('@@__') || key === 'constructor' || key === '$$typeof');

export class EchoObject {
  public _id!: string; // TODO(burdon): Symbol?
  public _item?: Item<ObjectModel>;
  public _database?: EchoDatabase;

  public _isImported = false;

  private _uninitialized?: Record<keyof any, any> = {};

  [unproxy]: EchoObject = this;

  constructor(initialProps?: Record<keyof any, any>) {
    this._id = PublicKey.random().toHex();
    Object.assign(this._uninitialized!, initialProps);

    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (!isValidKey(property)) {
          return Reflect.get(target, property, receiver);
        }

        switch (property) {
          case 'id':
            return this._id;
          default:
            return this._get(property as string);
        }
      },

      set: (target, property, value, receiver) => {
        if (isValidKey(property)) {
          return Reflect.set(target, property, value, receiver);
        }

        switch (property) {
          case 'id':
            throw new Error('Cannot set id');
          default: {
            this._set(property as string, value);
            return true;
          }
        }
      }
    });
  }

  // Allow to access arbitrary properties via dot notation.
  [key: string]: any;

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
    const type = this._item!.model.get(`${prop}$type`);
    const value = this._item!.model.get(prop);

    switch (type) {
      case 'ref':
        return this._database!.getObjectById(value);
      case 'object':
        return this._createSubObject(prop);
      case 'array':
        return new OrderedArray()._bind(this[unproxy], prop);
      default:
        return value;
    }
  }

  private _setModelProp(prop: string, value: any): any {
    if (value instanceof EchoObject) {
      this._item!.model.set(`${prop}$type`, 'ref'); // TODO(burdon): Async.
      this._item!.model.set(prop, value[unproxy]._id);
      this._database!.save(value);
    } else if (value instanceof OrderedArray) {
      this._item!.model.set(`${prop}$type`, 'array');
      value._bind(this[unproxy], prop);
    } else if (typeof value === 'object' && value !== null) {
      this._item!.model.set(`${prop}$type`, 'object');
      const sub = this._createSubObject(prop);
      for (const [subKey, subValue] of Object.entries(value)) {
        sub[subKey] = subValue;
      }
    } else {
      this._item!.model.set(`${prop}$type`, 'primitive');
      this._item!.model.set(prop, value);
    }
  }

  private _createSubObject(prop: string): any {
    return new Proxy(
      {},
      {
        get: (target, property, receiver) => {
          if (isValidKey(property)) {
            return Reflect.get(target, property, receiver);
          }

          return this._get(`${prop}.${String(property)}`);
        },
        set: (target, property, value, receiver) => {
          if (isValidKey(property)) {
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
