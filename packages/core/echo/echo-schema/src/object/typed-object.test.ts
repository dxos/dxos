//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/effect';

import { TypedObject } from './typed-object';
import { create } from '../handler';
import { getSchema } from '../proxy';
import { TEST_SCHEMA_TYPE } from '../testing';
import { ObjectId } from '../ast/object-id';

class Organization extends TypedObject(TEST_SCHEMA_TYPE)({
  id: ObjectId,
  name: S.String,
}) {}

const DEFAULT_ORG: Omit<Organization, 'id'> = { name: 'Test' };

describe('EchoObject class dsl', () => {
  test('type is a valid schema', async () => {
    expect(S.isSchema(Organization)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(Organization.typename).to.eq(TEST_SCHEMA_TYPE.typename);
  });

  test('static isInstance check', async () => {
    const obj = create(Organization, DEFAULT_ORG);
    expect(obj instanceof Organization).to.be.true;
    expect({ id: '12345', ...DEFAULT_ORG } instanceof Organization).to.be.false;
  });

  test('can get object schema', async () => {
    const obj = create(Organization, DEFAULT_ORG);
    expect(getSchema(obj)).to.deep.eq(Organization);
  });

  describe('class options', () => {
    class Person extends TypedObject<Person>({ typename: 'example.com/type/Person', version: '1.0.0' })(
      {
        id: ObjectId,
        name: S.String,
      },
      { partial: true, record: true },
    ) {}

    test('can assign undefined to partial fields', async () => {
      const person = create(Person, { name: 'John' });
      person.name = undefined;
      person.recordField = 'hello';
      expect(person.name).to.be.undefined;
      expect(person.recordField).to.eq('hello');
    });
  });
});
