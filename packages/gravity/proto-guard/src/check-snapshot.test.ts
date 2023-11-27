//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { type TextObject } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import { afterTest, beforeAll, describe, test } from '@dxos/test';

import { data } from './testing';
import { contains, getConfig, getStorageDir } from './util';

describe('Tests against old storage', () => {
  let testStoragePath: string;

  beforeAll(() => {
    // Copy storage image to tmp folder against which tests will be run.
    log.info(`Storage version ${STORAGE_VERSION}`);

    testStoragePath = fse.mkdtempSync(path.join(os.tmpdir(), 'proto-guard-'));
    fse.mkdirSync(testStoragePath, { recursive: true });
    const storagePath = path.join(getStorageDir(), STORAGE_VERSION.toString());

    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    fse.copySync(storagePath, testStoragePath, { overwrite: true });
  });

  test('check if space loads', async () => {
    const builder = new TestBuilder(getConfig(testStoragePath));
    afterTest(() => builder.destroy());
    const services = builder.createLocal();

    log.info('running', { storage: services.host?.config?.values.runtime?.client?.storage?.dataRoot });
    const client = new Client({ services });
    await asyncTimeout(client.initialize(), 1_000);
    afterTest(() => services.close());
    afterTest(() => client.destroy());

    const spaces = client.spaces.get();
    await asyncTimeout(Promise.all(spaces.map(async (space) => space.waitUntilReady())), 1_000);

    const space = spaces.find((space) => space.properties.name === data.space.properties.name);
    invariant(space, 'Space not found');

    {
      // Check epoch.
      const spaceBackend = services.host!.context.spaceManager.spaces.get(space.key) ?? failUndefined();
      await asyncTimeout(
        spaceBackend.controlPipeline.state.waitUntilTimeframe(spaceBackend.controlPipeline.state.endTimeframe),
        1_000,
      );
      const epoch = spaceBackend.dataPipeline.currentEpoch?.subject.assertion.number ?? -1;
      expect(epoch).to.equal(data.epochs);
    }

    {
      // TODO(dmaretskyi): Only needed because waitUntilReady seems to not guarantee that all objects will be present.
      const expectedObjects = 3;
      if (space.db.query(undefined, { models: ['*'] }).objects.length < expectedObjects) {
        const queryPromise = new Promise<void>((resolve) => {
          space.db.query().subscribe((query) => {
            if (query.objects.length >= expectedObjects) {
              resolve();
            }
          });
        });

        await asyncTimeout(queryPromise, 1_000);
      }
    }

    {
      // Space properties.
      expect(space.properties.toJSON()).to.contain(data.space.properties);

      // Expando.
      const expando = space.db.query({ type: 'expando' }).objects[0];
      expect(contains(expando.toJSON(), data.space.expando)).to.be.true;

      // Text.
      // TODO(mykola): add ability to query.
      const text = space.db.query({ text: data.space.text.content }, { models: ['*'] }).objects[0];
      expect((text as unknown as TextObject).text).to.equal(data.space.text.content);
    }
  });
});
