//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type EchoDatabase, Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { type S } from '@dxos/echo-schema';
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
    const { objects } = await db.query(Filter.schema(type)).run();
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
      const schema: S.Schema<Testing.OrgType> = Testing.OrgType as any;
      const objectGenerator = createGenerator(generator, schema, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const schema: S.Schema<Testing.ProjectType> = Testing.ProjectType as any;
      const objectGenerator = createGenerator(generator, schema, { optional: true });
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const schema: S.Schema<Testing.ContactType> = Testing.ContactType as any;
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
    db.graph.schemaRegistry.addSchema([Testing.OrgType, Testing.ProjectType, Testing.ContactType]);

    const spec: TypeSpec[] = [
      { type: Testing.OrgType, count: 5 },
      { type: Testing.ProjectType, count: 5 },
      { type: Testing.ContactType, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    const createObjects = createObjectFactory(db, generator);

    // Register mutable schema.
    const org = db.schemaRegistry.addSchema(Testing.OrgType);
    const project = db.schemaRegistry.addSchema(Testing.ProjectType);
    const contact = db.schemaRegistry.addSchema(Testing.ContactType);

    const spec: TypeSpec[] = [
      { type: org, count: 5 },
      { type: project, count: 5 },
      { type: contact, count: 10 },
    ];

    await createObjects(spec);
    await queryObjects(db, spec);
  });
});
