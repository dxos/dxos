//
// Copyright 2023 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Client } from '@dxos/client';
import { getObjectCore } from '@dxos/echo-db';
import { TypedObject, getType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { TestSchemaType, createSpaceObjectGenerator, createTestObjectGenerator } from './data';
import { SpaceObjectGenerator } from './generator';

faker.seed(3);

describe('TestObjectGenerator', () => {
  // TODO(burdon): Use TestBuilder.
  const setupTest = async () => {
    const client = new Client();
    await client.initialize();
    onTestFinished(async () => await client.destroy());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    return { client, space };
  };

  test('basic', async () => {
    const generator = createTestObjectGenerator();

    // Create raw object.
    const object = await generator.createObject({ types: [TestSchemaType.contact] });
    expect(object).to.exist;
  });

  test('with space', async () => {
    const { space } = await setupTest();

    const generator = createSpaceObjectGenerator(space);
    await generator.addSchemas();

    // Create org object.
    const organization = await generator.createObject({ types: [TestSchemaType.organization] });
    expect(getType(organization)).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = await generator.createObjects({ [TestSchemaType.contact]: 10 });
    expect(objects.some((object) => object.org?.target === organization)).to.be.true;
  });

  test('idempotence', async () => {
    const { space } = await setupTest();

    const schemaId: string[] = [];

    {
      const generator = createSpaceObjectGenerator(space);
      await generator.addSchemas();
      const organization = await generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(getType(organization)!.toString());
    }

    {
      const generator = createSpaceObjectGenerator(space);
      await generator.addSchemas();
      const organization = await generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(getType(organization)!.toString());
    }

    expect(schemaId[0]).not.to.be.undefined;
    expect(schemaId[0]).to.eq(schemaId[1]);
  });

  test('mutations', async () => {
    const { space } = await setupTest();
    const generator = createSpaceObjectGenerator(space);
    await generator.addSchemas();
    const document = await generator.createObject({ types: [TestSchemaType.document] });
    expect(getType(document)).to.exist;

    const beforeChangesCount = A.getAllChanges(getObjectCore(document).docHandle!.doc()).length;

    // Mutate the document.
    const mutationsCount = 10;
    await generator.mutateObject(document, { count: mutationsCount, maxContentLength: 1000, mutationSize: 10 });
    await space.db.flush();

    const changesCount = A.getAllChanges(getObjectCore(document).docHandle!.doc()).length;
    expect(changesCount - beforeChangesCount).to.be.eq(mutationsCount);
  });

  test('create object with in memory schema', async () => {
    class Task extends TypedObject({
      typename: 'example.org/type/Task',
      version: '0.1.0',
    })({
      name: Schema.optional(Schema.String),
    }) {}

    enum Types {
      task = 'example.org/type/Task',
    }

    const { space } = await setupTest();
    const generator = new SpaceObjectGenerator<Types>(
      space,
      { [Types.task]: Task },
      {
        [Types.task]: () => ({ name: 'Default' }),
      },
      {
        [Types.task]: async (task, params) => {
          for (const _ in Array.from({ length: params.count })) {
            task.name = faker.lorem.sentence();
          }
        },
      },
    );
    await generator.addSchemas();

    const todo = await generator.createObject({ types: [Types.task] });
    expect(getType(todo)).to.exist;
  });

  test('references', async () => {
    const { space } = await setupTest();
    const generator = createSpaceObjectGenerator(space);
    await generator.addSchemas();

    // Create raw object.
    const objects = await generator.createObjects({
      [TestSchemaType.organization]: 1,
      [TestSchemaType.contact]: 1,
    });
    expect(objects).to.exist;
    expect(objects.length).to.be.eq(2);
  });

  test('create project', async () => {
    const generator = createTestObjectGenerator();
    const project = await generator.createObject({ types: [TestSchemaType.project] });
    expect(getType(project)).to.exist;
  });

  test('create object with not type', async () => {
    // TODO(burdon): Create Client/spaces.
    const generator = createTestObjectGenerator();

    await generator.createObject();
  });
});
