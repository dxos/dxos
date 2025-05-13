//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { test } from 'vitest';

import { getTypename, toJsonSchema, TypedObject, Ref } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { live } from './object';

test('static schema definitions with references', async ({ expect }) => {
  // TODO(dmaretskyi): Extract test schema.
  class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
    name: Schema.String,
  }) {}

  class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
    name: Schema.String,
    email: Schema.String,
    organization: Ref(Organization),
  }) {}

  const organization = live(Organization, { name: 'Organization' });
  const person = live(Contact, { name: 'John', email: 'john@example.com', organization: Ref.make(organization) });
  log('schema', { organization: toJsonSchema(Organization), person: toJsonSchema(Contact) });
  log('objects', { organization, person });
  expect(getTypename(organization)).to.eq(Organization.typename);
  expect(getTypename(person)).to.eq(Contact.typename);
});
