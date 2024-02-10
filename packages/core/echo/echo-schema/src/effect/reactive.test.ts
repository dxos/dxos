//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as JSONSchema from '@effect/schema/JSONSchema';
import * as Pretty from '@effect/schema/Pretty';
import * as S from '@effect/schema/Schema';
import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { ReadonlyRecord } from 'effect';
import { type Mutable } from 'effect/Types';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { test, describe } from '@dxos/test';

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
// TODO(burdon): Branded types.
// TODO(burdon): S.instanceOf.
// TODO(burdon): Transformations: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#transformations
// TODO(burdon): New data types: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#understanding-schema-declaration-for-new-data-types

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

    expect(R.getSchema(person)).to.equal(ContactDef);

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
    const jsonSchema = JSONSchema.make(R.getSchema(person)!);
    expect(jsonSchema.$schema).to.equal('http://json-schema.org/draft-07/schema#');
  });

  test('Pretty', () => {
    const ContactDef = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const ContactPretty = Pretty.make(ContactDef);

    const person = R.object(ContactDef, {
      name: 'Satoshi',
    });

    const pretty = ContactPretty(person);
    expect(pretty).to.equal('{ "name": "Satoshi" }');
  });

  test('Indexing', () => {
    const ContactDef = S.struct({
      name: S.string.pipe(
        S.annotations({
          [R.IndexAnnotation]: true,
        }),
      ),
      publicKey: S.string,
    });

    // TODO(burdon): Implement recursive visitor.
    const indexed = AST.getPropertySignatures(ContactDef.ast).filter((p) => {
      const { indexed } = ReadonlyRecord.getSomes({ indexed: R.getIndexAnnotation(p.type) });
      return indexed;
    });

    expect(indexed).to.have.length(1);
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
