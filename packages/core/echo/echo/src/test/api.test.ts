//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { FormatAnnotation, FormatEnum } from '@dxos/echo-schema';

import { type Live, Obj, Ref, Relation, Type } from '../index';

namespace Testing {
  export const Organization = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String,
  }).pipe(
    Type.Obj({
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
    Type.Obj({
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
  //   Type.Relation({
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
    Type.Relation({
      typename: 'example.com/relation/WorksFor',
      version: '0.1.0',
      source: Person,
      target: Organization,
    }),
  );

  export interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

  // TODO(burdon): Fix (Type.Obj currently removes TypeLiteral that implements the `make` function).
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
    Type.Obj({
      typename: 'example.com/type/Message',
      version: '0.1.0',
    }),
  );

  export interface Message extends Schema.Schema.Type<typeof Message> {}
}

describe('Experimental API review', () => {
  test('type checks', ({ expect }) => {
    const contact = Obj.make(Testing.Person, { name: 'Test' });
    const type: Schema.Schema<Testing.Person> = Obj.getSchema(contact) ?? raise(new Error('No schema found'));

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
    const organization: Live<Testing.Organization> = Obj.make(Testing.Organization, { name: 'DXOS' });
    const contact: Live<Testing.Person> = Obj.make(Testing.Person, {
      name: 'Test',
      organization: Ref.make(organization),
    });

    expect(Schema.is(Testing.Person)(contact)).to.be.true;
    expect(Obj.instanceOf(Testing.Person, contact)).to.be.true;
    expect(Obj.instanceOf(Testing.Organization, organization)).to.be.true;

    const isPerson = Obj.instanceOf(Testing.Person);
    const x: any = {};
    if (isPerson(x)) {
      x.name;
    }
  });

  test('default props', ({ expect }) => {
    const message = Obj.make(Testing.Message, Testing.MessageStruct.make({}));
    expect(message.timestamp).to.exist;
  });

  test('Obj.isObject', ({ expect }) => {
    const guy = Obj.make(Testing.Person, { name: 'Test' });
    expect(Obj.isObject(guy)).to.be.true;
    expect(Obj.isObject(null)).to.be.false;
    expect(Obj.isObject(undefined)).to.be.false;
    expect(Obj.isObject(1)).to.be.false;
    expect(Obj.isObject('string')).to.be.false;
  });

  test('create relation', ({ expect }) => {
    const person = Obj.make(Testing.Person, { name: 'Test' });
    const organization = Obj.make(Testing.Organization, { name: 'DXOS' });
    const worksFor = Relation.make(Testing.WorksFor, {
      [Relation.Source]: person,
      [Relation.Target]: organization,
      role: 'CEO',
    });
    expect(Relation.getSource(worksFor)).to.eq(person);
    expect(Relation.getTarget(worksFor)).to.eq(organization);
  });

  test('version', ({ expect }) => {
    const person = Obj.make(Testing.Person, { name: 'Test' });
    const version = Obj.version(person);
    expect(Obj.isVersion(version)).to.be.true;
    expect(Obj.versionValid(version)).to.be.false;
  });

  test.skip('type narrowing', () => {
    const any: Obj.Any | Relation.Any = null as any;

    {
      if (Obj.isObject(any)) {
        any;
      } else {
        any;
      }
    }

    {
      if (Relation.isRelation(any)) {
        any;
      } else {
        any;
      }
    }
  });
});
