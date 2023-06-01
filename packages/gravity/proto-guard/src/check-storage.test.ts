//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client, Text } from '@dxos/client';
import { log } from '@dxos/log';
import { afterTest, test } from '@dxos/test';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getConfig } from './util';

test('check if space loads', async () => {
  const client = new Client({ config: getConfig() });
  afterTest(() => client.destroy());
  await client.initialize();
  const space = client.spaces.get()[0];
  await space.waitUntilReady();

  expect(space.properties.toJSON()).to.contain(expectedProperties);

  const expando = space.db.query({ type: 'expando' }).objects[0];
  expect(contains(expando.toJSON(), expectedExpando)).to.be.true;

  // TODO(maykola): add ability to query `Text`-s.
  const text = space.db.query({ text: expectedText }).objects[0];
  expect((text as unknown as Text).text).to.equal(expectedText);
});

const contains = (container: Record<string, any>, contained: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(contained)) {
    if (!valuesEqual(value, container[key])) {
      return false;
    }
  }

  return true;
};

const valuesEqual = (a: any, b: any): boolean => {
  try {
    if (Array.isArray(a)) {
      return (b as any[]).every((item1) => a.some((item2) => valuesEqual(item1, item2)));
    }
    if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
      return contains(a, b) && contains(b, a);
    }
    if (a !== b) {
      return false;
    }
  } catch (err) {
    log.warn('Error', err);
    return false;
  }

  return true;
};
