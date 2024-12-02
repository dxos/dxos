//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import { describe, expect, test } from 'vitest';

import { type EchoDatabase, Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { type AbstractSchema, type S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { stripUndefinedValues } from '@dxos/util';

import { type ValueGenerator, createArrayPipeline, createGenerator, createObjectPipeline } from './generator';
import { Test } from './types';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator: ValueGenerator = faker as any;

type TypeSpec = {
  type: AbstractSchema;
  count: number;
};

const createObjects = async (db: EchoDatabase, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    try {
      const pipeline = createObjectPipeline(generator, type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
      expect(objects).to.have.length(count);
      await db.flush();
    } catch (err) {
      log.catch(err);
    }
  }
};

const queryObjects = async (db: EchoDatabase, specs: TypeSpec[]) => {
  for (const { type, count } of specs) {
    const { objects } = await db.query(Filter.schema(type)).run();
    expect(objects).to.have.length(count);
    log.info('objects', {
      typename: type.typename,
      objects: objects.map((obj) => stripUndefinedValues({ name: obj.name, employer: obj.employer?.name })),
    });
  }
};

describe('Generator', () => {
  // TODO(burdon): Type error: https://github.com/dxos/dxos/issues/8324
  test('create object', async ({ expect }) => {
    {
      const objectGenerator = createGenerator(generator, Test.OrgType as any as S.Schema<Test.OrgType>);
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }

    {
      const objectGenerator = createGenerator(generator, Test.ContactSchema as any as S.Schema<Test.ContactType>);
      const object = objectGenerator.createObject();
      expect(object.name).to.exist;
    }
  });

  test('generate objects for static schema', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();

    // Register static schema.
    db.graph.schemaRegistry.addSchema([Test.OrgType, Test.ProjectType, Test.ContactType]);

    const spec: TypeSpec[] = [
      { type: Test.OrgType, count: 5 },
      { type: Test.ProjectType, count: 5 },
      { type: Test.ContactType, count: 10 },
    ];

    await createObjects(db, spec);
    await queryObjects(db, spec);
  });

  test('generate objects for mutable schema with references', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();

    // Register mutable schema.
    const org = db.schemaRegistry.addSchema(Test.OrgType);
    const project = db.schemaRegistry.addSchema(Test.ProjectType);
    const contact = db.schemaRegistry.addSchema(Test.ContactType);

    const spec: TypeSpec[] = [
      { type: org, count: 5 },
      { type: project, count: 5 },
      { type: contact, count: 10 },
    ];

    await createObjects(db, spec);
    await queryObjects(db, spec);
  });
});
