//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { test } from '@dxos/test';

import { expectedProperties } from './expected-objects';
import { getConfig } from './util';

test('check if space loads', async () => {
  const client = new Client({ config: getConfig() });
  await client.initialize();
  const space = client.spaces.get()[0];
  await space.waitUntilReady();

  expect(space.properties.toJSON()).to.contain(expectedProperties);
});
