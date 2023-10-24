//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { Client } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { testObjectGenerators, testSchemas } from './data';
import { SpaceObjectGenerator, TestObjectGenerator } from './generator';

faker.seed(3);

describe('TestObjectGenerator', () => {
  test.skip('basic', () => {
    const generator = new TestObjectGenerator(testSchemas(), testObjectGenerators);

    const object = generator.createObject({ types: ['person'] });
    expect(object).to.exist;
    console.log(JSON.stringify(object, undefined, 2));
  });

  test('with space', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const generator = new SpaceObjectGenerator(space, testSchemas(), testObjectGenerators);

    const organization = generator.createObject({ types: ['organization'] });
    console.log(JSON.stringify(organization, undefined, 2));
    expect(organization.__schema).to.exist; // TODO(burdon): undefined.

    console.log('::::', space.db.objects.length);
    const objects = generator.createObjects({ types: ['person'], count: 1 });
    console.log(JSON.stringify(objects, undefined, 2));

    await client.destroy();
  });
});
