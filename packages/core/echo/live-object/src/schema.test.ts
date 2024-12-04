//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { ref, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { create } from './object';
import { getTypename } from './proxy';

test('static schema definitions with references', async ({ expect }) => {
  class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
    name: S.String,
  }) {}

  class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
    name: S.String,
    email: S.String,
    org: ref(Org),
  }) {}

  const org = create(Org, { name: 'Org' });
  const person = create(Person, { name: 'John', email: 'john@example.com', org });
  log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
  log('objects', { org, person });
  expect(getTypename(org)).to.eq(Org.typename);
  expect(getTypename(person)).to.eq(Person.typename);
});
