//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import {
  EntityKind,
  FormatAnnotation,
  FormatEnum,
  getObjectAnnotation,
  getSchema,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
} from '@dxos/echo-schema';
import { create as live, makeRef } from '@dxos/live-object';

// TODO(dmaretskyi): Do all ECHO api's go into `Echo` or do some things like `create` and `Ref` stay separate?
import { Echo } from './api';

// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
interface _Live<T> {}
type Live<T> = _Live<T> & T;

//
//
//

interface Org extends S.Schema.Type<typeof Org> {}
const Org = Echo.Type({
  typename: 'example.com/type/Org',
  version: '0.1.0',
})(
  S.Struct({
    name: S.String,
  }),
);

// TODO(burdon): Remove Schema/Type suffix in Composer?

interface Contact extends S.Schema.Type<typeof Contact> {}
const Contact = Echo.Type({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(
  S.Struct({
    name: S.String,
    // TODO(burdon): Support S.Date, etc.
    // TODO(burdon): Support defaults.
    dob: S.optional(S.String),
    email: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
    org: S.optional(Echo.Ref(Org)),
  }),
);

describe('Experimental API review', () => {
  test('basic', ({ expect }) => {
    const org: Live<Org> = live(Org, { name: 'DXOS' });

    // TODO(burdon): Change makeRef to Ref.create?
    const contact: Live<Org> = live(Contact, { name: 'Test', org: makeRef(org) });

    // TODO(burdon): Rename getType; remove getType, getTypename, etc.
    const type: S.Schema<Contact> = getSchema(contact) ?? raise(new Error('No schema found'));
    expect(type).to.eq(Contact);
    expect(getSchemaTypename(type)).to.eq('example.com/type/Contact');
    expect(getSchemaVersion(type)).to.eq('0.1.0');

    // TODO(burdon): Rename getTypeAnnotation.
    expect(getObjectAnnotation(type)).to.deep.eq({
      kind: EntityKind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    });

    expect(getSchemaDXN(type)?.typename).to.eq(Contact.typename);
    expect(isInstanceOf(Contact, contact)).to.be.true;
  });
});
