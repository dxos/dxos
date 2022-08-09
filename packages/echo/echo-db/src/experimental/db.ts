//
// Copyright 2020 DXOS.org
//

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
// https://javascript.info/proxy
// https://www.javascripttutorial.net/es6/javascript-proxy

// TODO(burdon): Array-specific methods (e.g., push, replace, etc.)
//  http://www.jomendez.com/2018/12/29/querying-arrays-with-more-readable-methods-using-javascript-proxy
// class ArrayHandler<T> extends Handler {}

export type Mutation = [property: string, value: any]

export interface BaseObject {
  // Special properties added by proto generator.
  $id?: string
  $type?: string
  $mutations?: Mutation[]
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

  getMeta (p: string) {
    switch (p) {
      case '$id': {
        return this._id;
      }
      case '$type': {
        return this._type;
      }
      case '$mutations': {
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
    return proxyCtor(value) as any;
  }
}
