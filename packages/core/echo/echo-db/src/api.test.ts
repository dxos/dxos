//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import {
  FormatEnum,
  FormatAnnotationId,
  getSchema,
  getSchemaDXN,
  isInstanceOf,
  getObjectAnnotation,
  EntityKind,
  FormatAnnotation,
} from '@dxos/echo-schema';
import { create as live, makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';

// TODO(dmaretskyi): Do all ECHO api's go into `Echo` or do some things like `create` and `Ref` stay separate?
import { Echo } from './api';

// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
interface _Live<T> {}
type Live<T> = _Live<T> & T;

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
  email: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
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
    const org: Live<Org> = live(Org, { name: 'DXOS' });

    // TODO(burdon): Change makeRef to Ref.create?
    const contact: Live<Org> = live(Contact, { name: 'Test', org: makeRef(org) });

    // TODO(burdon): Rename getType; remove getType, getTypename, etc.
    const type: S.Schema<Contact> = getSchema(contact) ?? raise(new Error('No schema found'));
    expect(type).to.eq(Contact);

    // TODO(burdon): Rename getTypeAnnotation.
    expect(getObjectAnnotation(type)).to.deep.eq({
      kind: EntityKind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    });

    expect(getSchemaDXN(type)?.typename).to.eq(Contact.typename);
    expect(isInstanceOf(Contact, contact)).to.be.true;

    // TODO(burdon): Method to return EchoSchema.
    // const { typename, version } = type;
    log.info('ok');
  });
});
