//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { FormatEnum, FormatAnnotation } from '@dxos/echo-schema';

// Deliberately testing top-level import as if external consumer for @dxos/echo.
import { Type } from '.';

// TODO(dmaretskyi): Do all ECHO api's go into `Echo` or do some things like `create` and `Ref` stay separate?
//  RB: Let's get the main schema types cleanup up first since that has the biggest impact.

// RB: Commented out since lint error (is this just for debugging?)
// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
// interface _Live<T> {}
// type Live<T> = _Live<T> & T;
// const create = create_ as <T>(schema: S.Schema<T>, obj: T, meta?: ObjectMeta) => Live<T>;

// RB: I prefer this format since it seems like the most natural extension to the default effect API; and therefore, the most incremental.
const Org = S.Struct({
  id: Type.ObjectId,
  name: S.String,
}).pipe(
  Type.def({
    typename: 'example.com/type/Org',
    version: '0.1.0',
  }),
);

interface Org extends S.Schema.Type<typeof Org> {}

const Contact = S.Struct({
  name: S.String,
  dob: S.optional(S.String),
  email: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
  org: S.optional(Type.Ref(Org)),
}).pipe(
  Type.def({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

interface Contact extends S.Schema.Type<typeof Contact> {}

const Message = S.Struct({
  // TODO(burdon): Support S.Date; Custom Timestamp (with defaults).
  // TODO(burdon): Support defaults (update create and createStatic).
  timestamp: S.String.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => new Date().toISOString()),
  ),
});
// TODO(burdon): Fix.
// }).pipe(
//   Type.def({
//     typename: 'example.com/type/Message',
//     version: '0.1.0',
//   }),
// );

interface Message extends S.Schema.Type<typeof Message> {}

describe('Experimental API review', () => {
  test('basic', ({ expect }) => {
    const org = Type.create(Org, { name: 'DXOS' });

    // TODO(burdon): Change makeRef to Ref.create?
    const contact = Type.create(Contact, { name: 'Test', org: Type.ref(org) });
    // TODO(burdon): Implement.
    // const contact = Contact.create({ name: 'Test', org: Type.ref(org) });

    // TODO(burdon): Rename getType; remove getType, getTypename, etc.
    const type: S.Schema<Contact> = Type.getSchema(contact) ?? raise(new Error('No schema found'));
    expect(type).to.eq(Contact);
    // TODO(burdon): Implement.
    // expect(Contact.instanceOf(contact)).to.be.true;
    expect(Type.instanceOf(Contact, contact)).to.be.true;
    expect(Type.getDXN(type)?.typename).to.eq(Contact.typename);
    expect(Type.getTypename(type)).to.eq('example.com/type/Contact');
    expect(Type.getVersion(type)).to.eq('0.1.0');
    expect(Type.getMeta(type)).to.deep.eq({
      kind: Type.Kind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    });
  });

  test('defaults', ({ expect }) => {
    {
      // TODO(burdon): Doesn't work after pipe(Type.def).
      // Property 'make' does not exist on type 'EchoObjectSchema<Struct<{ timestamp: PropertySignature<":", string, never, ":", string, true, never>; }>>'.ts(2339)
      const message = Type.create(Message, Message.make({}));
      expect(message.timestamp).to.exist;
    }
    // {
    //   const message = new Message2({});
    //   expect(message.timestamp).to.exist;
    // }
  });
});
