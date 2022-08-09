//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { BaseObject, Database, Handler, ItemType } from './db';

//
// Generated from proto.
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
        return new Proxy(obj[p] ?? {}, new ContactNameHandler('', this, p, value => {
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

const ContactType: ItemType<Contact> = ['example.Contact', () => new ContactHandler('example.Contact')];

describe('Proxies', () => {
  test('Getters and setters.', () => {
    const db = new Database();
    db.addType(ContactType, value => new Proxy<Contact>(value, new ContactHandler('example.Contact')));

    // Create type-safe proxy.
    const item = db.create(ContactType);
    expect(item.$type).toEqual('example.Contact');
    expect(item.$id).toBeDefined();

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
  });

  // TODO(burdon): Array methods.
});
