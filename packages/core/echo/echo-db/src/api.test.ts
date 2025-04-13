//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import {
  EntityKind,
  FormatAnnotationId,
  FormatEnum,
  getObjectAnnotation,
  getSchema,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  isInstanceOf,
} from '@dxos/echo-schema';
import { create, makeRef } from '@dxos/live-object';

// TODO(dmaretskyi): Do all ECHO api's go into `Echo` or do some things like `create` and `Ref` stay separate?
import { Echo } from './api';

// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
// interface _Live<T> {}
// type Live<T> = _Live<T> & T;
// const create = create_ as <T>(schema: S.Schema<T>, obj: T, meta?: ObjectMeta) => Live<T>;

const Org = Echo.Type({
  typename: 'example.com/type/Org',
  version: '0.1.0',
})(
  S.Struct({
    name: S.String,
  }),
);

// TODO(burdon): Remove Schema/Type suffix in Composer.
interface Org extends S.Schema.Type<typeof Org> {}

const Contact = Echo.Type({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(
  S.Struct({
    name: S.String,
    dob: S.optional(S.String),
    email: S.optional(S.String.annotations({ [FormatAnnotationId]: FormatEnum.Email })),
    // email: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
    org: S.optional(Echo.Ref(Org)),
  }),
);

interface Contact extends S.Schema.Type<typeof Contact> {}

// const Message = Echo.Type({
//   typename: 'example.com/type/Message',
//   version: '0.1.0',
// })(
//   S.Struct({
//     // TODO(burdon): Support S.Date, etc.
//     // TODO(burdon): Support defaults (update create and createStatic).
//     timestamp: S.optional(S.String).pipe(
//       S.withDefaults({
//         constructor: () => new Date().toISOString(),
//         decoding: () => new Date().toISOString(),
//       }),
//     ),
//   }),
// );

// interface Message extends S.Schema.Type<typeof Message> {}

describe('Experimental API review', () => {
  test('basic', ({ expect }) => {
    const org = create(Org, { name: 'DXOS' });

    // TODO(burdon): Change makeRef to Ref.create?
    const contact = create(Contact, { name: 'Test', org: makeRef(org) });

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

  // test('defaults', ({ expect }) => {
  //   const message = create(Message);
  //   expect(message.timestamp).to.exist;
  // });
});
