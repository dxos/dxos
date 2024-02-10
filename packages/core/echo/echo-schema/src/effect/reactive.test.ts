//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { type Mutable } from 'effect/Types';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { test, describe } from '@dxos/test';

import { reactive } from './reactive';

registerSignalRuntime();

const noop = (...args: any[]) => {};

describe.only('reactive', () => {
  test('untyped', () => {
    const person = reactive({ name: 'Satoshi', age: 42 });
    expect(person.age).to.equal(42);

    {
      person.age = 53;
      expect(person.age).to.equal(53);
    }

    {
      let count = 0;
      effect(() => {
        noop(person.age);
        count++;
      });

      person.age = 54;
      expect(count).to.equal(2);
    }
  });

  test('deep reactivity', () => {
    class PhoneNumber {
      countryCode?: number;
      number?: string;
    }

    const person = reactive({
      name: 'Satoshi',
      age: 42,
      address: {
        street: 'Main Street',
        city: 'London',
      },
      phone: new PhoneNumber(),
    });

    {
      let count = 0;
      effect(() => {
        noop(person.address.city);
        noop(person.phone.number);
        count++;
      });

      person.address.city = 'New York';
      expect(count).to.equal(2);

      // Non-plains objects are not reactive.
      person.phone.number = '800-100-1234';
      expect(count).to.equal(2);

      // TODO(burdon): ???
      // expect(person.address === person.address, 'Proxies have stable references').to.be.true;
    }
  });

  test('typed', () => {
    const ContactDef = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.struct({
        street: S.string,
        city: S.string,
      }), // .pipe(S.optional), // TODO(burdon): optional doesn't build.
    });

    type Contact = S.Schema.To<typeof ContactDef>;

    const person: Mutable<Contact> = reactive(ContactDef, {
      name: 'Satoshi',
      age: 42,
      address: {
        street: 'Main Street',
        city: 'London',
      },
    });

    person.name = 'Satoshi Nakamoto';

    expect(() => {
      (person.address.city as any) = 42; // Runtime type error.
    }).to.throw();
  });

  // test.skip('storing to echo', () => {
  //   declare const db: any;

  //   const Person = S.struct({
  //     name: S.string,
  //     age: S.optional(S.number),
  //   });

  //   const person = reactive(Person, {
  //     name: 'John',
  //     age: 42,
  //   });

  //   db.add(person);

  //   person.age = 53; // Automerge mutation.
  // });
});
