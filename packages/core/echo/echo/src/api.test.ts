//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { FormatEnum, FormatAnnotation } from '@dxos/echo-schema';

// Deliberately testing top-level import as if external consumer for @dxos/echo.
import { Type } from '.';

namespace Testing {
  export const Organization = S.Struct({
    id: Type.ObjectId,
    name: S.String,
  }).pipe(
    Type.def({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );

  export interface Organization extends S.Schema.Type<typeof Organization> {}

  export const Contact = S.Struct({
    name: S.String,
    dob: S.optional(S.String),
    email: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
    organization: S.optional(Type.Ref(Organization)),
  }).pipe(
    Type.def({
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    }),
  );

  export interface Contact extends S.Schema.Type<typeof Contact> {}

  // export const WorksFor = S.Struct({
  //   id: Type.ObjectId,
  //   since: S.String,
  //   jobTitle: S.String,
  //   ...Range({ from, to }),
  //   ...Provenance({ source: 'duckduckgo.com', confidence: 0.9 }), // keys
  //   ...Relation.make({ source: Contact, target: Organization }),
  // }).pipe(
  //   Relation.def({
  //     typename: 'example.com/relation/WorksFor',
  //     version: '0.1.0',
  //   }),
  // );

  // {
  //   const contact = db.add(create(Contact, { name: 'Test' }));
  //   const organization = db.add(create(Organization, { name: 'DXOS' }));
  //   db.add(create(WorksFor, { source: contact, target: organization }));
  // }

  export const Message = S.Struct({
    // TODO(burdon): Support S.Date; Custom Timestamp (with defaults).
    // TODO(burdon): Support defaults (update create and create).
    timestamp: S.String.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => new Date().toISOString()),
    ),
  });

  // TODO(burdon): Fix (Type.def currently removes TypeLiteral that implements the `make` function)..
  // }).pipe(
  //   Type.def({
  //     typename: 'example.com/type/Message',
  //     version: '0.1.0',
  //   }),
  // );

  export interface Message extends S.Schema.Type<typeof Message> {}
}

describe('Experimental API review', () => {
  test('type checks', ({ expect }) => {
    const contact = Type.create(Testing.Contact, { name: 'Test' });
    const type: S.Schema<Testing.Contact> = Type.getSchema(contact) ?? raise(new Error('No schema found'));

    expect(Type.getDXN(type)?.typename).to.eq(Testing.Contact.typename);
    expect(Type.getTypename(type)).to.eq('example.com/type/Contact');
    expect(Type.getVersion(type)).to.eq('0.1.0');
    expect(Type.getMeta(type)).to.deep.eq({
      kind: Type.Kind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    });
  });

  test('instance checks', ({ expect }) => {
    const organization = Type.create(Testing.Organization, { name: 'DXOS' });
    const contact = Type.create(Testing.Contact, { name: 'Test', organization: Type.ref(organization) });

    expect(S.is(Testing.Contact)(contact)).to.be.true;
    expect(Testing.Contact.instanceOf(contact)).to.be.true;
    expect(Type.instanceOf(Testing.Contact, contact)).to.be.true;
    expect(Type.instanceOf(Testing.Organization, organization)).to.be.true;
  });

  test('default props', ({ expect }) => {
    // TODO(burdon): Doesn't work after pipe(Type.def).
    // Property 'make' does not exist on type 'EchoObjectSchema<Struct<{ timestamp: PropertySignature<":", string, never, ":", string, true, never>; }>>'.ts(2339)
    const message = Type.create(Testing.Message, Testing.Message.make({}));
    expect(message.timestamp).to.exist;
  });
});
