//
// Copyright 2024 DXOS.org
//

import { describe, expect, test, afterEach, beforeEach } from 'vitest';

import { type EchoDatabase, Query } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { stripUndefined } from '@dxos/util';

import { type TypeSpec, type ValueGenerator, createGenerator, createObjectFactory } from './generator';
import { DataType } from '../common';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = {
  ...faker,
} as any as ValueGenerator;

const queryObjects = async (db: EchoDatabase, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const { objects } = await db.query(Query.type(type)).run();
    expect(objects).to.have.length(count);
    log.info('objects', {
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

  // TODO(burdon): Test view creation.
  // TODO(burdon): Type error: https://github.com/dxos/dxos/issues/8324
  test('create object', async ({ expect }) => {
    {
      const objectGenerator = createGenerator(generator, DataType.Organization, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, DataType.Project, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, DataType.Person, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.fullName).to.exist;
    }
  });

  test('generate objects for static schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register static schema.
    db.graph.schemaRegistry.addSchema([DataType.Organization, DataType.Project, DataType.Person]);

    const spec: TypeSpec[] = [
      { type: DataType.Organization, count: 5 },
      { type: DataType.Project, count: 5 },
      { type: DataType.Person, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const [organization] = await db.schemaRegistry.register([DataType.Organization]);
    const [project] = await db.schemaRegistry.register([DataType.Project]);
    const [person] = await db.schemaRegistry.register([DataType.Person]);

    const spec: TypeSpec[] = [
      { type: organization, count: 5 },
      { type: project, count: 5 },
      { type: person, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate message from static schema', async ({ expect }) => {
    const messageSchema = DataType.Message;
    const messageGenerator = createGenerator(generator, messageSchema, { optional: true });
    const message = messageGenerator.createObject();
    expect(message).to.exist;
  });

  test('generate message from stored schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const messageSchema = (await db.schemaRegistry.register([DataType.Message]))[0];
    console.log(toJsonSchema(messageSchema));
    const messageGenerator = createGenerator(generator, messageSchema, { optional: true });
    const message = messageGenerator.createObject();
    expect(message).to.exist;
  });
});
