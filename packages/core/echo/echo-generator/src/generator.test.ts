//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import * as E from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { afterTest, describe, test } from '@dxos/test';

import { createSpaceObjectGenerator, createTestObjectGenerator, TestSchemaType } from './data';

faker.seed(3);

describe('TestObjectGenerator', () => {
  test('basic', () => {
    const generator = createTestObjectGenerator();

    // Create raw object.
    const object = generator.createObject({ types: [TestSchemaType.contact] });
    expect(object).to.exist;
  });

  test('with space', async () => {
    const { space } = await setupTest();

    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    // Create org object.
    const organization = generator.createObject({ types: [TestSchemaType.organization] });
    expect(E.typeOf(organization)).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = generator.createObjects({ [TestSchemaType.contact]: 10 });
    expect(objects.some((object) => object.org === organization)).to.be.true;
  });

  test('idempotence', async () => {
    const { space } = await setupTest();

    const schemaId: string[] = [];

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(E.typeOf(organization)!.itemId);
    }

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(E.typeOf(organization)!.itemId);
    }

    expect(schemaId[0]).not.to.be.undefined;
    expect(schemaId[0]).to.eq(schemaId[1]);
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
