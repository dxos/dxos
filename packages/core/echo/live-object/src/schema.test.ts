//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { Ref, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { create } from './object';
import { getTypename } from './proxy';
import { makeRef } from './ref';

test('static schema definitions with references', async ({ expect }) => {
  // TODO(dmaretskyi): Extract test schema.
  class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
    name: S.String,
  }) {}

  class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
    name: S.String,
    email: S.String,
    org: Ref(Org),
  }) {}

  const org = create(Org, { name: 'Org' });
  const person = create(Contact, { name: 'John', email: 'john@example.com', org: makeRef(org) });
  log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Contact) });
  log('objects', { org, person });
  expect(getTypename(org)).to.eq(Org.typename);
  expect(getTypename(person)).to.eq(Contact.typename);
});
