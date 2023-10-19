//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { fromHost } from '@dxos/client/services';
import { Context } from '@dxos/context';
import { describe, test } from '@dxos/test';

import { EpochMonitor } from './epoch-monitor';

describe('EpochMonitor', () => {
  let ctx: Context;
  let client: Client;
  let monitor: EpochMonitor;

  beforeEach(async () => {
    ctx = new Context();

    const config = new Config();
    client = new Client({ services: await fromHost(config) });
    await client.initialize();
    await client.halo.createIdentity();

    monitor = new EpochMonitor();
    await monitor.initialize({ client, clientServices: client.services, plugins: [] });

    ctx.onDispose(async () => {
      await client.destroy();
      await monitor.close();
    });
  });

  afterEach(async () => {
    await ctx.dispose();
  });

  test('open and close', async () => {
    await monitor.open();

    {
      // TODO(burdon): Create mutations and wait for epoch to be triggered.
      const space = await client.spaces.create();
      expect(space.key).to.exist;

      // TODO(burdon): Race condition if attempting to close while space waiting to be ready.
      await sleep(100);
    }

    await monitor.close();
  }).tag('flaky');

  test('id', async () => {
    expect(monitor.id).to.equal('EpochMonitor');
  });
});
