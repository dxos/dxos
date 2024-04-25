//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ref } from './annotations';
import { getSchema } from './getter';
import { create } from './handler';
import { TypedObject } from './typed-object-class';
import { Filter } from '../query';
import { createDatabase } from '../testing';

class Organization extends TypedObject({ typename: 'Organization', version: '1.0.0' })({
  name: S.string,
}) {}

const DEFAULT_ORG: Omit<Organization, 'id'> = { name: 'FooCorp' };

describe('EchoObject class dsl', () => {
  const setupDatabase = async () => {
    const result = await createDatabase();
    result.graph.runtimeSchemaRegistry.registerSchema(Organization);
    return result;
  };

  test('type is a valid schema', async () => {
    expect(S.isSchema(Organization)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(Organization.typename).to.eq('Organization');
  });

  test('static isInstance check', async () => {
    const { db } = await setupDatabase();
    const obj = db.add(create(Organization, { ...DEFAULT_ORG }));
    expect(obj instanceof Organization).to.be.true;
    expect({ id: '12345', ...DEFAULT_ORG } instanceof Organization).to.be.false;
  });

  test('can register schema in hypergraph', async () => {
    const { graph } = await setupDatabase();
    expect(graph.runtimeSchemaRegistry.isSchemaRegistered(Organization)).to.be.true;
  });

  test('objects can be added to the database', async () => {
    const { db } = await setupDatabase();
    const obj = db.add(create(Organization, { ...DEFAULT_ORG }));
    expect(obj.id).to.be.a('string');
    expect(obj.name).to.eq(DEFAULT_ORG.name);
  });

  test('can get object schema', async () => {
    const { db } = await setupDatabase();
    const obj = db.add(create(Organization, { ...DEFAULT_ORG }));
    expect(getSchema(obj)).to.deep.eq(Organization);
  });

  test('can query objects by type', async () => {
    const { db } = await setupDatabase();
    db.add(create(Organization, { ...DEFAULT_ORG }));
    const query = await db.query(Filter.schema(Organization)).run();
    expect(query.objects[0].name).to.eq(DEFAULT_ORG.name);
  });

  describe('references', () => {
    class Person extends TypedObject<Person>({ typename: 'Person', version: '1.0.0' })({
      name: S.string,
      worksAt: ref(Organization),
    }) {}

    test('references', async () => {
      const { db, graph } = await setupDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Person);
      const org = db.add(create(Organization, { ...DEFAULT_ORG }));
      const person = db.add(create(Person, { name: 'John', worksAt: org }));
      expect(person.worksAt).to.eq(org);
    });

    test('adding nested structures to DB', async () => {
      const { db, graph } = await setupDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Person);
      const person = db.add(create(Person, { name: 'John', worksAt: create(Organization, { ...DEFAULT_ORG }) }));
      expect(person.worksAt?.name).to.eq(DEFAULT_ORG.name);
      expect(person.worksAt?.id).to.be.a('string');
    });
  });

  describe('class options', () => {
    class Person extends TypedObject<Person>({ typename: 'Person', version: '1.0.0' })(
      {
        name: S.string,
      },
      { partial: true },
    ) {}

    test('can assign undefined to partial fields', async () => {
      const { db, graph } = await setupDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Person);
      const person = db.add(create(Person, { name: 'John' }));
      person.name = undefined;
      expect(person.name).to.be.undefined;
    });
  });
});
