//
// Copyright 2024 DXOS.org
//

import { type Schema } from 'effect';
import { describe, expect, test } from 'vitest';

import { type EchoDatabase, Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { stripUndefined } from '@dxos/util';

import { type ValueGenerator, createGenerator, type TypeSpec, createObjectFactory } from './generator';
import { Testing } from './types';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = faker as any;

const queryObjects = async (db: EchoDatabase, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const { objects } = await db.query(Filter.type(type)).run();
    expect(objects).to.have.length(count);
    log.info('objects', {
      typename: type.typename,
      objects: objects.map((obj) => stripUndefined({ name: obj.name, employer: obj.employer?.name })),
    });
  }
};

describe('Generator', () => {
  // TODO(burdon): Test view creation.
  // TODO(burdon): Type error: https://github.com/dxos/dxos/issues/8324
  test('create object', async ({ expect }) => {
    {
      const schema: Schema.Schema<Testing.Organization> = Testing.Organization;
      const objectGenerator = createGenerator(generator, schema, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const schema: Schema.Schema<Testing.Project> = Testing.Project;
      const objectGenerator = createGenerator(generator, schema, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const schema: Schema.Schema<Testing.Contact> = Testing.Contact as any; // TODO(burdon): Fix.
      const objectGenerator = createGenerator(generator, schema, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }
  });

  test('generate objects for static schema', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register static schema.
    db.graph.schemaRegistry.addSchema([Testing.Organization, Testing.Project, Testing.Contact]);

    const spec: TypeSpec[] = [
      { type: Testing.Organization, count: 5 },
      { type: Testing.Project, count: 5 },
      { type: Testing.Contact, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const [organization] = await db.schemaRegistry.register([Testing.Organization]);
    const [project] = await db.schemaRegistry.register([Testing.Project]);
    const [contact] = await db.schemaRegistry.register([Testing.Contact]);

    const spec: TypeSpec[] = [
      { type: organization, count: 5 },
      { type: project, count: 5 },
      { type: contact, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });
});
