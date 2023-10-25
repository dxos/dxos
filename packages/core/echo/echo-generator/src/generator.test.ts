//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { Client } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { createSpaceObjectGenerator, createTestObjectGenerator } from './data';

faker.seed(3);

describe('TestObjectGenerator', () => {
  test('basic', () => {
    const generator = createTestObjectGenerator();

    // Create raw object.
    const object = generator.createObject({ types: ['person'] });
    expect(object).to.exist;
  });

  test('with space', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const generator = createSpaceObjectGenerator(space);

    // Add schemas.
    generator.addSchemas();

    // Create org object.
    const organization = generator.createObject({ types: ['organization'] });
    expect(organization.__schema).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = generator.createObjects({ types: ['person'], count: 10 });
    expect(objects.some((object) => object.org === organization)).to.be.true;

    await client.destroy();
  });
});
