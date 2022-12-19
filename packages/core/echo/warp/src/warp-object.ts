import { Item } from "@dxos/echo-db";
import { ObjectModel } from "@dxos/object-model";

export const unproxy = Symbol('unproxy');

export class WarpObject {
  private _item?: Item<ObjectModel>;
  private _uninitialized?: Record<keyof any, any> = {};

  constructor() {
    return new Proxy(this, {
      get: (target, property, receiver) => {
        if(property === unproxy) {
          return this;
        }

        if(!this._item) {
          return this._uninitialized![property];
        } else {
          return this._item.model.get(property as string);
        }
      },
      set: (target, property, value, receiver) => {
        if(!this._item) {
          this._uninitialized![property] = value;
        } else {
          this._item.model.set(property as string, value); // todo: Preprocess value
        }
        return true;
      }
    });
  }

  [unproxy]!: WarpObject;

  // Allow to access arbitrary properties via dot notation.
  [key: string]: any;

  /**
   * @internal
   */
  _import(item: Item<ObjectModel>) {
    this._item = item;
    for(const [key, value] of Object.entries(this._uninitialized!)) {
      this._item.model.set(key, value);
    }

    this._uninitialized = undefined;
  }
}