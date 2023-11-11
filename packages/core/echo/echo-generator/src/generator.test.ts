//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { Client } from '@dxos/client';
import { debug } from '@dxos/client/echo';
import { describe, test } from '@dxos/test';

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
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    // Create org object.
    const organization = generator.createObject({ types: [TestSchemaType.organization] });
    expect(organization.__schema).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = generator.createObjects({ [TestSchemaType.contact]: 10 });
    expect(objects.some((object) => object.org === organization)).to.be.true;

    await client.destroy();
  });

  test.only('idempotence', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const schemaId: string[] = [];

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(organization.__schema!.id);
    }

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      const organization = generator.createObject({ types: [TestSchemaType.organization] });
      schemaId.push(organization.__schema!.id);
    }

    expect(schemaId[0]).to.eq(schemaId[1]);

    {
      console.log(space.db.objects.map((object) => object[debug]));
    }

    await client.destroy();
  });
});
