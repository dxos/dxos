//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import {
  BaseObject,
  Database,
  Handler,
  ItemType,
  Operation,
  propId,
  propType,
  propMutations
} from './db';

//
// Generated from proto.
// TODO(burdon): Add proto definition to test.
//

interface Contact extends BaseObject {
  name?: {
    first?: string
    last?: string
  }
  age?: number
  emails?: string[]

  fullname?: string // TODO(burdon): Show how to add custom functions.
}

//
// Generated from proto.
// TODO(burdon): Or generic runtime class or generate prototype-chain?
//

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
        this.addMutation([Operation.SET, `${this._property}.${p}`, value]);
        obj[p] = value;
        this._callback?.(obj);
        return true;
      }
    }

    return false; // Throws TypeError.
  }
}

class ContactHandler extends Handler<Contact> {
  get (obj: any, p: string | Symbol) {
    if (typeof p === 'symbol') {
      const value = this.getProp(obj, p);
      if (value !== undefined) {
        return value;
      }
    }

    switch (p) {
      case 'name': {
        return new Proxy(obj[p] ?? {}, new ContactNameHandler('', this, p, value => {
          obj[p] = value;
        }));
      }
    }

    return obj[p];
  }

  set (obj: any, p: string, value: any) {
    this.addMutation([Operation.SET, p, value]);
    obj[p] = value; // TODO(burdon): Process mutation via state machine.

    switch (p) {
      case 'age':
      case 'name':
      case 'emails':
        return true;
    }

    return false;
  }
}

const ContactType: ItemType<Contact> = ['example.Contact', () => new ContactHandler('example.Contact')];

describe('Proxies', () => {
  test('Getters and setters.', () => {
    const db = new Database();
    db.addType(ContactType, value => new Proxy<Contact>(value, new ContactHandler('example.Contact')));

    // Create type-safe proxy.
    const item = db.create(ContactType);
    expect(item[propType]).toEqual('example.Contact');
    expect(item[propId]).toBeDefined();

    item.age = 64;
    expect(item[propMutations]).toHaveLength(1);
    expect(item).toEqual({ age: 64 });

    item.name!.first = 'Alice';
    expect(item.name?.first).toBe('Alice');
    expect(item[propMutations]).toHaveLength(2);
    expect(item).toEqual({ age: 64, name: { first: 'Alice' } });

    // console.log(item);
    // console.log(item[propMutations]);

    expect(item[propMutations]).toStrictEqual([
      [Operation.SET, 'age', 64],
      [Operation.SET, 'name.first', 'Alice']
    ]);
  });

  // TODO(burdon): Array methods.
  // TODO(burdon): DB traversal.
});
