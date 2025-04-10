//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { FormatEnum, FormatAnnotationId, getSchema, getSchemaDXN, isInstanceOf } from '@dxos/echo-schema';
import { create, makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';

import { Echo } from './api';

const Org = S.Struct({
  name: S.String,
}).pipe(
  Echo.Type({
    typename: 'example.com/type/Org',
    version: '0.1.0',
  }),
);

// TODO(burdon): Remove Schema/Type suffix in Composer?
interface Org extends S.Schema.Type<typeof Org> {}

const Contact = S.Struct({
  name: S.String,
  // TODO(burdon): Support S.Date, etc.
  // TODO(burdon): Support defaults.
  dob: S.optional(S.String),
  email: S.optional(
    S.String.annotations({
      // TODO(burdon): Rename TypeAnnotationId?
      // TODO(burdon): Use typed helper?
      [FormatAnnotationId]: FormatEnum.Email,
    }),
  ),
  org: S.optional(Echo.Ref(Org)),
}).pipe(
  Echo.Type({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

interface Contact extends S.Schema.Type<typeof Contact> {}

describe('Experimental API review', () => {
  test('basic', ({ expect }) => {
    const org: Org = create(Org, { name: 'DXOS' });

    // TODO(burdon): Change makeRef to Ref.create?
    const contact: Contact = create(Contact, { name: 'Test', org: makeRef(org) });

    // TODO(burdon): Rename getType; remove getType, getTypename, etc.
    const type: S.Schema<Contact> = getSchema(contact) ?? raise(new Error('No schema found'));
    expect(type).to.eq(Contact);
    expect(getSchemaDXN(type)?.typename).to.eq(Contact.typename);
    expect(isInstanceOf(Contact, contact)).to.be.true;

    // TODO(burdon): Method to return EchoSchema.
    // const { typename, version } = type;
    log.info('ok');
  });
});
