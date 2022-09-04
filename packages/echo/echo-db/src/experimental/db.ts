//
// Copyright 2020 DXOS.org
//

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
// https://javascript.info/proxy
// https://www.javascripttutorial.net/es6/javascript-proxy

// TODO(burdon): Array-specific methods (e.g., push, replace, etc.)
//  http://www.jomendez.com/2018/12/29/querying-arrays-with-more-readable-methods-using-javascript-proxy
// class ArrayHandler<T> extends Handler {}

// Note: Symbols will not show up in `JSON.stringify`.
export const propId = Symbol('id');
export const propType = Symbol('type');
export const propMutations = Symbol('mutations');

// TODO(burdon): Prototype new mutation protodefs.
export enum Operation {
  SET,
  REMOVE
}

export type Mutation = [operation: Operation, property: string, value: any]

export interface BaseObject {
  // Special properties added by proto generator.
  [propId]?: string
  [propType]?: string
  [propMutations]?: Mutation[]
}

export class Handler<T> {
  _id = String(Date.now());
  _mutations: Mutation[] = [];

  constructor (
    private readonly _type: string,
    private readonly _parent?: Handler<any>,
    protected readonly _property?: string,
    protected readonly _callback?: (value: T) => void
  ) {}

  addMutation (mutation: Mutation) {
    if (this._parent) {
      this._parent.addMutation(mutation);
    } else {
      this._mutations.push(mutation);
    }
  }

  getProp (obj: T, p: Symbol) {
    // TODO(burdon): Add id, type as symbol properties to item.
    const props = Object.getOwnPropertySymbols(obj);
    console.log(props);

    switch (p) {
      case propId: {
        return this._id;
      }
      case propType: {
        return this._type;
      }
      case propMutations: {
        return this._mutations;
      }
    }
  }
}

export type ItemType<T extends BaseObject> = [string, () => Handler<T>]

export class Database {
  private readonly _types = new Map<ItemType<any>, (value: any) => typeof Proxy>();

  addType (type: ItemType<any>, constructor: (value: any) => any) {
    this._types.set(type, constructor);
    return this;
  }

  create<T extends BaseObject> (type: ItemType<T>, value: T = {} as T): T {
    const proxyCtor = this._types.get(type)!;
    const item = proxyCtor(value) as any;
    // item[propId] = Date.now();
    // item[propType] = type[0];
    return item;
  }
}
