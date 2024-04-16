//
// Copyright 2024 DXOS.org
//

import { type AST, ParseResult } from '@effect/schema';
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

import * as R from './reactive';

registerSignalRuntime();

const noop = (...args: any[]) => {};

// https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#introduction

// TODO(burdon): Future proof protocol (vs. schema migration after integration with ts-effect)?
//  types, fields vs. properties, encoding, migration plan, etc.

// TODO(burdon): References.
// TODO(burdon): Indexer (strings, numbers).
// TODO(burdon): Identifier annotations for recursive schemas: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#recursive-and-mutually-recursive-schemas
// TODO(burdon): Decode unknown: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#decoding-from-unknown
// TODO(burdon): Transformations: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#transformations
// TODO(burdon): Handle async: https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#handling-async-transformations
// TODO(burdon): New data types (e.g., for identifiers, blobs): https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#understanding-schema-declaration-for-new-data-types
// TODO(burdon): Branded types.

describe('reactive', () => {
  test('untyped', () => {
    const person = R.create({ name: 'Satoshi', age: 42 });
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

    const person = R.create({
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
      person.phone.number = '(800) 100-1234';
      expect(count).to.equal(2);
    }
  });

  test('typed', () => {
    const Contact = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.optional(
        S.struct({
          street: S.optional(S.string),
          city: S.string,
        }),
      ),
    });

    type Contact = S.Schema.Type<typeof Contact>;

    const person: Contact = R.create(Contact, {
      name: 'Satoshi',
      age: 42,
      address: {
        street: '西麻布',
        city: 'Tokyo',
      },
    });

    expect(R.getSchema(person)).to.equal(Contact);

    {
      const mutable: Mutable<Contact> = person;
      mutable.name = 'Satoshi Nakamoto';
      mutable.address = { city: 'London' };
      expect(() => {
        // Runtime type error.
        mutable.address = {} as Contact['address'];
      }).to.throw();
      expect(() => {
        // Runtime type error.
        set(mutable, 'address.city', 42);
      }).to.throw();
    }
  });

  test('validation', () => {
    // TODO(burdon): Factor out type defs (email, url, key, etc.)
    const Email = S.pattern(/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i);

    const StringKey: S.Schema<string> = S.string.pipe(S.length(64)).pipe(S.identifier('PublicKey'));

    // TODO(burdon): Test.
    const isPublicKey = (input: unknown): input is PublicKey => input instanceof PublicKey;
    const PublicKeyFromSelf: S.Schema<PublicKey> = S.declare(isPublicKey, { identifier: 'PublicKeyFromSelf' });
    const _PublicKeyFromString: S.Schema<PublicKey, string> = S.transform(
      S.string,
      PublicKeyFromSelf,
      (s) => PublicKey.from(s),
      (value) => value.toHex(),
    );

    // TODO(burdon): Test.
    const TypedKey: S.Schema<PublicKey, PublicKey> = S.transformOrFail(
      S.any,
      S.any,
      (s, _, ast) => {
        return ParseResult.try({
          try: () => PublicKey.fromHex(s),
          catch: () => new ParseResult.Type(ast, s),
        });
      },
      (value) => {
        return ParseResult.succeed(String(value));
      },
    );

    const Contact = S.struct({
      timestamp: S.DateFromSelf,
      key1: S.optional(StringKey),
      key2: S.optional(TypedKey),
      // key3: S.optional(PublicKeyFromString),
      name: S.string,
      email: S.optional(S.string.pipe(Email)),
    });

    type Contact = S.Schema.Type<typeof Contact>;
    const ContactPretty = Pretty.make(Contact);

    const person: Mutable<Contact> = R.create(Contact, {
      timestamp: new Date(),
      key1: PublicKey.random().toHex(),
      key2: PublicKey.random(),
      // key3: PublicKey.random(),
      name: 'Satoshi',
      email: 'satoshi@bitcoin.com',
    });

    console.log(ContactPretty(person));

    expect(() => {
      // Runtime type error.
      person.email = 'invalid-email-address';
    }).to.throw();
  });

  test('references', () => {
    const Organization = S.struct({
      name: S.string,
      website: S.optional(S.string),
    });

    const Contact = S.struct({
      name: S.string,
      employer: S.optional(Organization),
    });

    const org = R.create(Organization, {
      name: 'DXOS',
    });

    const person = R.create(Contact, {
      name: 'Satoshi',
      employer: org,
    });

    expect(person.employer).to.deep.eq(org);

    // TODO(burdon): Should equal by reference.
    //  TypeError: 'get' on proxy: property 'Symbol(@dxos/type/AST)' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected '#<Object>' but got '#<Object>')
    // expect(person.employer).to.eq(org);
  });

  test('JSON schema', () => {
    const Contact = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const person = R.create(Contact, {
      name: 'Satoshi',
    });

    // NOTE: Will throw if identifiers are not given for each property.
    const jsonSchema = JSONSchema.make(R.getSchema(person)!);
    expect(jsonSchema.$schema).to.equal('http://json-schema.org/draft-07/schema#');
  });

  test('pretty', () => {
    const Contact = S.struct({
      name: S.string.pipe(S.identifier('name')),
    });

    const ContactPretty = Pretty.make(Contact);

    const person = R.create(Contact, {
      name: 'Satoshi',
    });

    const pretty = ContactPretty(person);
    expect(pretty).to.equal('{ "name": "Satoshi" }');
  });

  test('reduce', () => {
    const Contact = S.struct({
      name: S.string,
      address: S.optional(
        S.struct({
          street: S.optional(S.string),
          city: S.string,
          zip: S.string,
        }),
      ),
    });

    const paths = R.reduce<string[]>(
      Contact.ast,
      (paths, _, path) => {
        paths.push(path.join('.'));
        return paths;
      },
      [],
    );

    // TODO(burdon): Order?
    expect(paths).to.deep.eq(['name', 'address', 'address.city', 'address.zip', 'address.street']);
  });

  test('indexing', () => {
    const Contact = S.struct({
      publicKey: S.string,
      name: S.string.pipe(
        S.annotations({
          [R.IndexAnnotation]: true, // TODO(burdon): Can only be applied to literal.
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

    // TODO(burdon): Factor out util and separate fn that maps to orama index.
    type IndexProperty = { path: string; type: AST.AST };
    const getIndexedProperties = (ast: AST.AST): IndexProperty[] => {
      return R.reduce<IndexProperty[]>(
        ast,
        (properties, { type }, path) => {
          const { indexed } = ReadonlyRecord.getSomes({ indexed: R.getIndexAnnotation(type) });
          if (indexed) {
            properties.push({ path: path.join('.'), type });
          }

          return properties;
        },
        [],
      );
    };

    const properties = getIndexedProperties(Contact.ast);
    expect(properties.map(({ path }) => path)).to.deep.eq(['name', 'address.city']);

    {
      const person = R.create(Contact, {
        publicKey: PublicKey.random().toHex(),
        name: 'Satoshi',
        address: {
          city: 'Tokyo',
        },
      });

      const values: { path: string; value: any }[] = [];
      for (const { path } of properties) {
        const value = get(person, path);
        if (value !== undefined) {
          values.push({ path, value });
        }
      }

      expect(values).to.deep.eq([
        { path: 'name', value: 'Satoshi' },
        { path: 'address.city', value: 'Tokyo' },
      ]);
    }
  });
});
