//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Database, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { type TypeSpec, type ValueGenerator, createGenerator, createObjectFactory } from '@dxos/schema/testing';
import { stripUndefined } from '@dxos/util';

import { Message, Organization, Person, Project } from '../types';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = {
  ...faker,
} as any as ValueGenerator;

const queryObjects = async (db: Database.Database, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const objects = await db.query(Query.type(type)).run();
    expect(objects).to.have.length(count);
    log('objects', {
      typename: type.typename,
      objects: objects.map((obj) => stripUndefined({ name: obj.name, employer: obj.employer?.name })),
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
      const objectGenerator = createGenerator(generator, Project.Project, {
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
    await db.graph.schemaRegistry.register([Organization.Organization, Project.Project, Person.Person]);

    const spec: TypeSpec[] = [
      { type: Organization.Organization, count: 5 },
      { type: Person.Person, count: 10 },
      { type: Project.Project, count: 5 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const [organization] = await db.schemaRegistry.register([Organization.Organization]);
    const [person] = await db.schemaRegistry.register([Person.Person]);
    const [project] = await db.schemaRegistry.register([Project.Project]);

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
    const schema = (await db.schemaRegistry.register([Message.Message]))[0];
    const objectGenerator = createGenerator(generator, schema, { force: true });
    const object = objectGenerator.createObject();
    expect(object).to.exist;
  });
});
