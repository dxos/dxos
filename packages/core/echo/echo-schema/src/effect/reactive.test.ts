//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from '@effect/schema/JSONSchema';
import * as Pretty from '@effect/schema/Pretty';
import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { ReadonlyRecord } from 'effect';
import { type Mutable } from 'effect/Types';
import get from 'lodash.get';
import set from 'lodash.set';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { test, describe } from '@dxos/test';

import { visitProperties } from './reactive';
import * as R from './reactive';

registerSignalRuntime();

const noop = (...args: any[]) => {};

// https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#introduction

// TODO(burdon): References.
// TODO(burdon): Mutable/immutable objects.
// TODO(burdon): Structured queries (and index).
// TODO(burdon): Annotations (e.g., indexed).
// TODO(burdon): Identifier annotations for recursive schemas: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#recursive-and-mutually-recursive-schemas
// TODO(burdon): Decode unknown: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#decoding-from-unknown
// TODO(burdon): Handle async: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#handling-async-transformations
// TODO(burdon): Transformations: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#transformations
// TODO(burdon): New data types (e.g., for identifiers, blobs): https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#understanding-schema-declaration-for-new-data-types
// TODO(burdon): Branded types.

describe.only('reactive', () => {
  test('untyped', () => {
    const person = R.object({ name: 'Satoshi', age: 42 });
    expect(person.age).to.equal(42);

    {
      const value = JSON.stringify(person);
      expect(value).to.equal(JSON.stringify({ name: 'Satoshi', age: 42 }));
    }

    {
      person.age = 43;
      expect(person.age).to.equal(43);
    }

    {
      let count = 0;
      effect(() => {
        noop(person.age);
        count++;
      });

      person.age = 44;
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

    expect(R.getSchema(person)).to.be.undefined;

    {
      let count = 0;
      effect(() => {
        noop(person.address.city);
        noop(person.phone.number);
        count++;
      });

      person.address.city = 'New York';
      expect(count).to.equal(2);

      // Non-plain objects are not reactive.
      person.phone.countryCode = 1;
      person.phone.number = '800-100-1234';
      expect(count).to.equal(2);
    }
  });

  test('typed', () => {
    const Contact = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.optional(
        S.struct({
          street: S.string,
          city: S.string,
        }),
      ),
    });

    type Contact = S.Schema.To<typeof Contact>;

    const person: Mutable<Contact> = R.object(Contact, {
      name: 'Satoshi',
      age: 42,
      address: {
        street: '西麻布',
        city: 'Tokyo',
      },
    });

    expect(R.getSchema(person)).to.equal(Contact);

    person.name = 'Satoshi Nakamoto';
    expect(() => {
      set(person, 'address.city', 42); // Runtime type error.
    }).to.throw();
  });

  test('JSON schema', () => {
    const Contact = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const person = R.object(Contact, {
      name: 'Satoshi',
    });

    // NOTE: Will throw if identifiers are not given for each property.
    const jsonSchema = JSONSchema.make(R.getSchema(person)!);
    expect(jsonSchema.$schema).to.equal('http://json-schema.org/draft-07/schema#');
  });

  test('Pretty', () => {
    const Contact = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const ContactPretty = Pretty.make(Contact);

    const person = R.object(Contact, {
      name: 'Satoshi',
    });

    const pretty = ContactPretty(person);
    expect(pretty).to.equal('{ "name": "Satoshi" }');
  });

  test('Indexing', () => {
    const Contact = S.struct({
      publicKey: S.string,
      name: S.string.pipe(
        S.annotations({
          [R.IndexAnnotation]: true,
        }),
      ),
      address: S.optional(
        S.struct({
          street: S.optional(S.string),
          city: S.string.pipe(
            S.annotations({
              [R.IndexAnnotation]: true,
            }),
          ),
        }),
      ),
    });

    const properties: string[] = [];

    {
      visitProperties(Contact.ast, (p, path) => {
        const { indexed } = ReadonlyRecord.getSomes({ indexed: R.getIndexAnnotation(p.type) });
        if (indexed) {
          properties.push(path.join('.'));
        }
      });

      expect(properties).to.deep.eq(['name', 'address.city']);
    }

    {
      const person = R.object(Contact, {
        publicKey: PublicKey.random().toHex(),
        name: 'Satoshi',
        address: {
          city: 'Tokyo',
        },
      });

      const values: { path: string; value: any }[] = [];
      for (const prop of properties) {
        const value = get(person, prop);
        if (value !== undefined) {
          values.push({ path: prop, value });
        }
      }

      expect(values).to.deep.eq([
        { path: 'name', value: 'Satoshi' },
        { path: 'address.city', value: 'Tokyo' },
      ]);
    }
  });
});
