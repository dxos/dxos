//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';

import { Obj, Ref, Relation, Type } from '../index';

import { TestSchema } from './test-schema';

describe('Experimental API review', () => {
  test('type checks', ({ expect }) => {
    const contact = Obj.make(TestSchema.Person, { name: 'Test' });
    const type: Schema.Schema<TestSchema.Person> = Obj.getSchema(contact) ?? raise(new Error('No schema found'));

    expect(Type.getDXN(type)?.typename).to.eq(TestSchema.Person.typename);
    expect(Type.getTypename(type)).to.eq('example.com/type/Person');
    expect(Type.getVersion(type)).to.eq('0.1.0');
    expect(Type.getMeta(type)).to.deep.eq({
      kind: Type.Kind.Object,
      typename: 'example.com/type/Person',
      version: '0.1.0',
    });
  });

  test('instance checks', ({ expect }) => {
    const organization = Obj.make(TestSchema.Organization, { name: 'DXOS' });
    const contact = Obj.make(TestSchema.Person, {
      name: 'Test',
      employer: Ref.make(organization),
    });

    expect(Schema.is(TestSchema.Person)(contact)).to.be.true;
    expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;
    expect(Obj.instanceOf(TestSchema.Organization, organization)).to.be.true;

    const isPerson = Obj.instanceOf(TestSchema.Person);
    const x: any = {};
    if (isPerson(x)) {
      x.name;
    }
  });

  test('default props', ({ expect }) => {
    const message = Obj.make(TestSchema.Message, TestSchema.MessageStruct.make({}));
    expect(message.timestamp).to.exist;
  });

  test('Obj.isObject', ({ expect }) => {
    const guy = Obj.make(TestSchema.Person, { name: 'Test' });
    expect(Obj.isObject(guy)).to.be.true;
    expect(Obj.isObject(null)).to.be.false;
    expect(Obj.isObject(undefined)).to.be.false;
    expect(Obj.isObject(1)).to.be.false;
    expect(Obj.isObject('string')).to.be.false;
  });

  test('create relation', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Test' });
    const organization = Obj.make(TestSchema.Organization, { name: 'DXOS' });
    const worksFor = Relation.make(TestSchema.EmployedBy, {
      [Relation.Source]: person,
      [Relation.Target]: organization,
      role: 'CEO',
    });
    expect(Relation.getSource(worksFor)).to.eq(person);
    expect(Relation.getTarget(worksFor)).to.eq(organization);
  });

  test('version', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Test' });
    const version = Obj.version(person);
    expect(Obj.isVersion(version)).to.be.true;
    expect(Obj.versionValid(version)).to.be.false;
  });

  // TODO(burdon): Implement test.
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
