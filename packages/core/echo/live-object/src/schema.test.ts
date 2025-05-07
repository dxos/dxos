//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { test } from 'vitest';

import { getTypename, Ref, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { live } from './object';
import { makeRef } from './ref';

test('static schema definitions with references', async ({ expect }) => {
  // TODO(dmaretskyi): Extract test schema.
  class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
    name: S.String,
  }) {}

  class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
    name: S.String,
    email: S.String,
    organization: Ref(Organization),
  }) {}

  const organization = live(Organization, { name: 'Organization' });
  const person = live(Contact, { name: 'John', email: 'john@example.com', organization: makeRef(organization) });
  log('schema', { organization: toJsonSchema(Organization), person: toJsonSchema(Contact) });
  log('objects', { organization, person });
  expect(getTypename(organization)).to.eq(Organization.typename);
  expect(getTypename(person)).to.eq(Contact.typename);
});
