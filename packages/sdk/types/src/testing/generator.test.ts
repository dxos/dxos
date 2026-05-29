//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Database, Query, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { type TypeSpec, type ValueGenerator, createGenerator, createObjectFactory } from '@dxos/schema/testing';
import { stripUndefined } from '@dxos/util';

import { Message, Organization, Person, Pipeline } from '../types';

random.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = {
  ...random,
} as any as ValueGenerator;

const queryObjects = async (db: Database.Database, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const query = Type.isType(type) ? Query.type(type) : Query.type(type);
    const objects = await db.query(query).run();
    expect(objects).to.have.length(count);
    log('objects', {
      typename: Type.getTypename(type),
      objects: objects.map((obj: any) => stripUndefined({ name: obj.name, employer: obj.employer?.name })),
    });
  }
};

describe('Generator', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create object', async ({ expect }) => {
    {
      const objectGenerator = createGenerator(generator, Organization.Organization, { force: true });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, Person.Person, {
        force: true,
      });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, Pipeline.Pipeline, {
        force: true,
      });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }
  });

  test('generate objects for static schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register static schema.
    db.graph.registry.add([Organization.Organization, Pipeline.Pipeline, Person.Person]);

    const spec: TypeSpec[] = [
      { type: Organization.Organization, count: 5 },
      { type: Person.Person, count: 10 },
      { type: Pipeline.Pipeline, count: 5 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const organization = await db.addType(Organization.Organization);
    const person = await db.addType(Person.Person);
    const project = await db.addType(Pipeline.Pipeline);

    const spec: TypeSpec[] = [
      { type: organization, count: 5 },
      { type: person, count: 10 },
      { type: project, count: 5 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate message from static schema', async ({ expect }) => {
    const schema = Message.Message;
    const objectGenerator = createGenerator(generator, schema, { force: true });
    const object = objectGenerator.createObject();
    expect(object).to.exist;
  });

  test('generate message from stored schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const type = await db.addType(Message.Message);
    invariant(Type.isObject(type), 'expected object type');
    const objectGenerator = createGenerator(generator, type, { force: true });
    const object = objectGenerator.createObject();
    expect(object).to.exist;
  });
});
