//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
// https://javascript.info/proxy
// https://www.javascripttutorial.net/es6/javascript-proxy

// TODO(burdon): Array-specific methods (e.g., push, replace, etc.)
//  http://www.jomendez.com/2018/12/29/querying-arrays-with-more-readable-methods-using-javascript-proxy
// class ArrayHandler<T> extends Handler {}

type Mutation = [property: string, value: any]

interface Object {
  // Special properties added by proto generator.
  $id?: string
  $type?: string
  $mutations?: Mutation[]
}

class Handler<T> {
  _mutations: Mutation[] = [];

  constructor (
    private readonly _parent?: Handler<any>,
    protected readonly _property?: string,
    protected readonly _callback?: (value: T) => void
  ) {}

  get mutations () {
    return this._mutations;
  }

  addMutation (mutation: Mutation) {
    if (this._parent) {
      this._parent.addMutation(mutation);
    } else {
      this._mutations.push(mutation);
    }
  }

  getMeta (p: string) {
    switch (p) {
      case '$mutations': {
        return this._mutations;
      }
    }
  }
}

//
// TODO(burdon): Generated from proto.
//

interface Contact extends Object {
  name?: {
    first?: string
    last?: string
  }
  age?: number
  emails?: string[]

  fullname?: string // TODO(burdon): Show how to add custom functions.
}

class ContactNameHandler extends Handler<Contact['name']> {
  get (obj: any, p: string) {
    switch (p) {
      case 'first':
      case 'last': {
        return obj[p];
      }
    }
  }

  set (obj: any, p: string, value: any) {
    switch (p) {
      case 'first':
      case 'last': {
        this.addMutation([`${this._property}.${p}`, value]);
        obj[p] = value;
        this._callback?.(obj);
        return true;
      }
    }

    return false;
  }
}

class ContactHandler extends Handler<Contact> {
  get (obj: any, p: string) {
    const result = super.getMeta(p);
    if (result !== undefined) {
      return result;
    }

    switch (p) {
      case 'name': {
        return new Proxy(obj[p] ?? {}, new ContactNameHandler(this, p, value => {
          obj[p] = value;
        }));
      }
    }

    return obj[p];
  }

  set (obj: any, p: string, value: any) {
    this.addMutation([p, value]);
    obj[p] = value;
    return true; // Throws TypeError if false.
  }
}

type ItemType<T extends object> = [string, () => Handler<T>]

const ContactType: ItemType<Contact> = ['example.Contact', () => new ContactHandler()];

class Database {
  private readonly _types = new Map<ItemType<any>, (value: any) => typeof Proxy>();

  addType (type: ItemType<any>, constructor: (value: any) => any) {
    this._types.set(type, constructor);
    return this;
  }

  create<T extends object> (type: ItemType<T>, value: T = {} as T): T {
    const constructor = this._types.get(type)!;
    return constructor(value) as any;
  }
}

describe('API', () => {
  test('Pseudo-code', () => {
    const db = new Database();
    db.addType(ContactType, value => new Proxy<Contact>(value, new ContactHandler()));

    // Create type-safe proxy.
    const item = db.create(ContactType);

    item.age = 64;
    expect(item.$mutations).toHaveLength(1);
    expect(item).toEqual({ age: 64 });

    item.name!.first = 'Alice';
    expect(item.name?.first).toBe('Alice');
    expect(item.$mutations).toHaveLength(2);
    expect(item).toEqual({ age: 64, name: { first: 'Alice' } });

    expect(item.$mutations).toStrictEqual([
      ['age', 64],
      ['name.first', 'Alice']
    ]);

    // TODO(burdon): Get item id, state, mutations, etc.
  });
});
