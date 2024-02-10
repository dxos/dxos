//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from '@effect/schema/JSONSchema';
import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { type Mutable } from 'effect/Types';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { test, describe } from '@dxos/test';

import { R } from './reactive';

registerSignalRuntime();

const noop = (...args: any[]) => {};

// TODO(burdon): References.
// TODO(burdon): Mutable/immutable.
// TODO(burdon): Queries.
// TODO(burdon): Annotations (e.g., indexed).

describe.only('reactive', () => {
  test('untyped', () => {
    const person = R.object({ name: 'Satoshi', age: 42 });
    expect(person.age).to.equal(42);

    {
      const value = JSON.stringify(person);
      expect(value).to.equal(JSON.stringify({ name: 'Satoshi', age: 42 }));
    }

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

    const person = R.object({
      name: 'Satoshi',
      age: 42,
      address: {
        street: 'Main Street',
        city: 'London',
      },
      phone: new PhoneNumber(),
    });

    expect(R.schema(person)).to.be.undefined;

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
      person.phone.countryCode = 1;
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

    const person: Mutable<Contact> = R.object(ContactDef, {
      name: 'Satoshi',
      age: 42,
      address: {
        street: '西麻布',
        city: 'Tokyo',
      },
    });

    expect(R.schema(person)).to.equal(ContactDef);

    person.name = 'Satoshi Nakamoto';
    expect(() => {
      (person.address.city as any) = 42; // Runtime type error.
    }).to.throw();
  });

  test('JSON schema', () => {
    const ContactDef = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const person = R.object(ContactDef, {
      name: 'Satoshi',
    });

    // NOTE: Will throw if identifiers are not given for each property.
    const schema = JSONSchema.make(R.schema(person)!);
    expect(schema.$schema).to.equal('http://json-schema.org/draft-07/schema#');
  });

  test.skip('ECHO insert and query', () => {
    // declare const db: any;

    const ContactDef = S.struct({
      name: S.string,
      age: S.optional(S.number),
    });

    const person = R.object(ContactDef, {
      name: 'Satoshi',
      age: 42,
    });

    // db.add(person);
    expect(person).to.exist;
  });
});
