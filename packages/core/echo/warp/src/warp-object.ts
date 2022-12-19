import { todo } from "@dxos/debug";
import { Item } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { ObjectModel } from "@dxos/object-model";
import { WarpDatabase } from "./warp-database";

export const unproxy = Symbol('unproxy');

export class WarpObject {
  public _id!: string;
  private _item?: Item<ObjectModel>;
  private _database?: WarpDatabase;
  private _uninitialized?: Record<keyof any, any> = {};

  public _isImported = false;

  constructor(initialProps?: Record<keyof any, any>) {
    this._id = PublicKey.random().toHex();
    Object.assign(this._uninitialized!, initialProps);

    return new Proxy(this, {
      get: (target, property, receiver) => {
        switch(property) {
          case unproxy:
            return this;
          case 'id':
            return this._id;
          default:
            return this._get(property as string);
        } 
      },
      set: (target, property, value, receiver) => {
        switch(property) {
          case 'id':
            throw new Error('Cannot set id');
          default:
            this._set(property as string, value);
            return true;
        }
        
      }
    });
  }

  [unproxy]!: WarpObject;

  // Allow to access arbitrary properties via dot notation.
  [key: string]: any;

  private _get(key: string) {
    if(!this._item) {
      return this._uninitialized![key];
    } else {
      return this._getModelProp(key);
    }
  }

  private _set(key: string, value: any) {
    if(!this._item) {
      this._uninitialized![key] = value;
    } else {
      this._setModelProp(key, value);
    }
  }

  private _getModelProp(prop: string): any {
    const type = this._item!.model.get(`${prop}$type`);
    const value = this._item!.model.get(prop);

    switch(type) {
      case 'ref':
        todo()
      default:
        return value;
    }

  }

  private _setModelProp(prop: string, value: any): any {
    this._item!.model.set(prop, value);
  }

  /**
   * @internal
   */
  _import(item: Item<ObjectModel>, database: WarpDatabase) {
    this._item = item;
    this._database = database;

    for(const [key, value] of Object.entries(this._uninitialized!)) {
      this._item.model.set(key, value);
    }

    this._uninitialized = undefined;
  }
}