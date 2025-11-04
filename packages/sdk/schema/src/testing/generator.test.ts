//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type EchoDatabase, Query } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { stripUndefined } from '@dxos/util';

import { DataType } from '../common';

import { type TypeSpec, type ValueGenerator, createGenerator, createObjectFactory } from './generator';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = {
  ...faker,
} as any as ValueGenerator;

const queryObjects = async (db: EchoDatabase, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const { objects } = await db.query(Query.type(type)).run();
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
      const objectGenerator = createGenerator(generator, DataType.Organization.Organization, { force: true });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, DataType.Person.Person, { force: true });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, DataType.Project.Project, { force: true });
      const object = objectGenerator.createObject();
      expect(object).to.exist;
    }
  });

  test('generate objects for static schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register static schema.
    db.graph.schemaRegistry.addSchema([
      DataType.Organization.Organization,
      DataType.Project.Project,
      DataType.Person.Person,
    ]);

    const spec: TypeSpec[] = [
      { type: DataType.Organization.Organization, count: 5 },
      { type: DataType.Person.Person, count: 10 },
      { type: DataType.Project.Project, count: 5 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const [organization] = await db.schemaRegistry.register([DataType.Organization.Organization]);
    const [person] = await db.schemaRegistry.register([DataType.Person.Person]);
    const [project] = await db.schemaRegistry.register([DataType.Project.Project]);

    const spec: TypeSpec[] = [
      { type: organization, count: 5 },
      { type: person, count: 10 },
      { type: project, count: 5 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate message from static schema', async ({ expect }) => {
    const schema = DataType.Message;
    const objectGenerator = createGenerator(generator, schema, { force: true });
    const object = objectGenerator.createObject();
    expect(object).to.exist;
  });

  test('generate message from stored schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const schema = (await db.schemaRegistry.register([DataType.Message]))[0];
    const objectGenerator = createGenerator(generator, schema, { force: true });
    const object = objectGenerator.createObject();
    expect(object).to.exist;
  });
});
