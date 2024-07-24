//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { Client } from '@dxos/client';
import { getObjectCore } from '@dxos/echo-db';
import { getType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { afterTest, describe, test } from '@dxos/test';

import { createSpaceObjectGenerator, createTestObjectGenerator, TestSchemaType } from './data';

faker.seed(3);

describe('TestObjectGenerator', () => {
  test('basic', async () => {
    const generator = createTestObjectGenerator();

    // Create raw object.
    const object = await generator.createObject({ types: [TestSchemaType.contact] });
    expect(object).to.exist;
  });

  test('with space', async () => {
    const { space } = await setupTest();

    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    // Create org object.
    const organization = await generator.createObject({ types: [TestSchemaType.organization] });
    expect(getType(organization)).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = await generator.createObjects({ [TestSchemaType.contact]: 10 });
    expect(objects.some((object) => object.org === organization)).to.be.true;
  });

  test('idempotence', async () => {
    const { space } = await setupTest();

    const schemaId: string[] = [];

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = await generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(getType(organization)!.objectId);
    }

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = await generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(getType(organization)!.objectId);
    }

    expect(schemaId[0]).not.to.be.undefined;
    expect(schemaId[0]).to.eq(schemaId[1]);
  });

  test('mutations', async () => {
    const { space } = await setupTest();
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    const document = await generator.createObject({ types: [TestSchemaType.document] });
    expect(getType(document)).to.exist;

    const beforeChangesCount = A.getAllChanges(getObjectCore(document).docHandle!.docSync()).length;

    // Mutate the document.
    const mutationsCount = 10;
    await generator.mutateObject(document, { count: mutationsCount, maxContentLength: 1000, mutationSize: 10 });
    await space.db.flush();

    const changesCount = A.getAllChanges(getObjectCore(document).docHandle!.docSync()).length;
    expect(changesCount - beforeChangesCount).to.be.eq(mutationsCount);
  });

  const setupTest = async () => {
    const client = new Client();
    await client.initialize();
    afterTest(async () => await client.destroy());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    return { client, space };
  };
});
