//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/effect';

import { TypedObject } from './typed-object';
import { create } from '../handler';
import { getSchema } from '../proxy';

class OrganizationType extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
  name: S.String,
}) {}

class PersonType extends TypedObject<PersonType>({ typename: 'example.com/type/Person', version: '0.1.0' })(
  {
    name: S.String,
  },
  { partial: true, record: true },
) {}

const DEFAULT_ORG: Omit<OrganizationType, 'id'> = { name: 'Test' };

describe('EchoObject class dsl', () => {
  test('type is a valid schema', async () => {
    expect(S.isSchema(OrganizationType)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(OrganizationType.typename).to.eq('example.com/type/Organization');
  });

  test('static isInstance check', async () => {
    const obj = create(OrganizationType, DEFAULT_ORG);
    expect(obj instanceof OrganizationType).to.be.true;
    expect({ id: '12345', ...DEFAULT_ORG } instanceof OrganizationType).to.be.false;
  });

  test('can get object schema', async () => {
    const obj = create(OrganizationType, DEFAULT_ORG);
    expect(getSchema(obj)).to.deep.eq(OrganizationType);
  });

  describe('class options', () => {
    test('can assign undefined to partial fields', async () => {
      const person = create(PersonType, { name: 'John' });
      person.name = undefined;
      person.recordField = 'hello';
      expect(person.name).to.be.undefined;
      expect(person.recordField).to.eq('hello');
    });
  });
});
