//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';

/**
 * VITEST_ENV=chromium npx vitest --ui
 */
describe('compute graph', () => {
  test.only('sanity', async () => {
    console.log('<<<<<');
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    console.log(1);
    await client.halo.createIdentity({ displayName: 'test' });
    console.log(2);
    await client.spaces.create();
    console.log('>>>>>');
  });
});
