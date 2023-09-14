//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fse from 'fs-extra';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { Text } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import { afterAll, afterTest, beforeAll, describe, test } from '@dxos/test';

import { expectedEpoch, expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getConfig, getStorageDir } from './util';

describe('Tests against old storage', () => {
  const testStoragePath = path.join('/tmp/dxos/proto-guard/storage/', STORAGE_VERSION.toString());

  beforeAll(() => {
    // Copy storage image to tmp folder against which tests will be run.
    log.info(`Storage version ${STORAGE_VERSION}`);

    fse.mkdirSync(testStoragePath, { recursive: true });
    const storagePath = path.join(getStorageDir(), STORAGE_VERSION.toString());

    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    fse.copySync(storagePath, testStoragePath, { overwrite: true });
  });

  afterAll(() => {
    fse.removeSync(testStoragePath);
  });

  test('check if space loads', async () => {
    const builder = new TestBuilder();
    builder.config = getConfig(testStoragePath);
    const services = builder.createLocal();
    const client = new Client({ services });
    await asyncTimeout(client.initialize(), 1000);
    afterTest(() => services.close());
    afterTest(() => client.destroy());

    log.info('Running test', { storage: client.config.values.runtime?.client?.storage?.path });
    const spaces = client.spaces.get();
    await asyncTimeout(Promise.all(spaces.map(async (space) => space.waitUntilReady())), 1000);

    const space = spaces.find((space) => space.properties.name === expectedProperties.name);
    invariant(space, 'Space not found');

    {
      // Check epoch.
      const spaceBackend = services.host!.context.spaceManager.spaces.get(space.key) ?? failUndefined();
      await asyncTimeout(
        spaceBackend.controlPipeline.state.waitUntilTimeframe(spaceBackend.controlPipeline.state.endTimeframe),
        1000,
      );
      const epoch = spaceBackend.dataPipeline.currentEpoch?.subject.assertion.number ?? -1;
      expect(epoch).to.equal(expectedEpoch);
    }

    {
      // TODO(dmaretskyi): Only needed because waitUntilReady seems to not guarantee that all objects will be present.
      const expectedObjects = 3;
      if (space.db.query().objects.length < expectedObjects) {
        const queryPromise = new Promise<void>((resolve) => {
          space.db.query().subscribe((query) => {
            if (query.objects.length >= expectedObjects) {
              resolve();
            }
          });
        });
        await asyncTimeout(queryPromise, 1000);
      }
    }

    {
      // Check expando.
      expect(space.properties.toJSON()).to.contain(expectedProperties);

      const expando = space.db.query({ type: 'expando' }).objects[0];
      expect(contains(expando.toJSON(), expectedExpando)).to.be.true;
    }

    {
      // Check text.
      // TODO(maykola): add ability to query `Text`-s.
      const text = space.db.query({ text: expectedText }).objects[0];
      expect((text as unknown as Text).text).to.equal(expectedText);
    }
  });
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
