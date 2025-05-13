//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { FormatEnum, FormatAnnotation } from '@dxos/echo-schema';

import { Type } from './api';

namespace Testing {
  export const Organization = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String,
  }).pipe(
    Type.def({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );

  export interface Organization extends Schema.Schema.Type<typeof Organization> {}

  export const Person = Schema.Struct({
    name: Schema.String,
    dob: Schema.optional(Schema.String),
    email: Schema.optional(Schema.String.pipe(FormatAnnotation.set(FormatEnum.Email))),
    organization: Schema.optional(Type.Ref(Organization)),
  }).pipe(
    Type.def({
      typename: 'example.com/type/Person',
      version: '0.1.0',
    }),
  );

  export interface Person extends Schema.Schema.Type<typeof Person> {}

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

  export const WorksFor = Schema.Struct({
    // id: Type.ObjectId,
    role: Schema.String,
  }).pipe(
    // Relation.def
    Type.def({
      typename: 'example.com/type/WorksFor',
      version: '0.1.0',
      // source: Person,
      // target: Organization,
    }),
  );

  export interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

  // TODO(burdon): Fix (Type.def currently removes TypeLiteral that implements the `make` function).
  //  Property 'make' does not exist on type 'EchoObjectSchema<Struct<{ timestamp: PropertySignature<":", string, never, ":", string, true, never>; }>>'.ts(2339)
  export const MessageStruct = Schema.Struct({
    // TODO(burdon): Support S.Date; Custom Timestamp (with defaults).
    // TODO(burdon): Support defaults (update create and create).
    timestamp: Schema.String.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().toISOString()),
    ),
  });

  export const Message = MessageStruct.pipe(
    Type.def({
      typename: 'example.com/type/Message',
      version: '0.1.0',
    }),
  );

  export interface Message extends Schema.Schema.Type<typeof Message> {}
}

describe('Experimental API review', () => {
  test('type checks', ({ expect }) => {
    const contact = Type.create(Testing.Person, { name: 'Test' });
    const type: Schema.Schema<Testing.Person> = Type.getSchema(contact) ?? raise(new Error('No schema found'));

    expect(Type.getDXN(type)?.typename).to.eq(Testing.Person.typename);
    expect(Type.getTypename(type)).to.eq('example.com/type/Person');
    expect(Type.getVersion(type)).to.eq('0.1.0');
    expect(Type.getMeta(type)).to.deep.eq({
      kind: Type.Kind.Object,
      typename: 'example.com/type/Person',
      version: '0.1.0',
    });
  });

  test('instance checks', ({ expect }) => {
    const organization = Type.create(Testing.Organization, { name: 'DXOS' });
    const contact = Type.create(Testing.Person, { name: 'Test', organization: Type.ref(organization) });

    expect(Schema.is(Testing.Person)(contact)).to.be.true;
    expect(Testing.Person.instanceOf(contact)).to.be.true;
    expect(Type.instanceOf(Testing.Person, contact)).to.be.true;
    expect(Type.instanceOf(Testing.Organization, organization)).to.be.true;
  });

  test('default props', ({ expect }) => {
    const message = Type.create(Testing.Message, Testing.MessageStruct.make({}));
    expect(message.timestamp).to.exist;
  });
});
