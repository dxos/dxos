//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client, Config, fromHost } from '@dxos/client';
import { Context } from '@dxos/context';

import { EpochMonitorPlugin } from './plugin';

describe('EpochMonitor', () => {
  let ctx: Context;
  let client: Client;
  let plugin: EpochMonitorPlugin;

  beforeEach(async () => {
    ctx = new Context();

    const config = new Config({
      runtime: { agent: { plugins: [{ id: 'dxos.org/agent/plugin/epoch-monitor' }] } },
    });

    client = new Client({ config, services: await fromHost(config) });
    await client.initialize();
    await client.halo.createIdentity();

    plugin = new EpochMonitorPlugin();
    await plugin.initialize({ client, clientServices: client.services });

    ctx.onDispose(async () => {
      await client.destroy();
      await plugin.close();
    });
  });

  afterEach(async () => {
    await ctx.dispose();
  });

  // TODO(wittjosiah): Flaky.
  test.skip('open and close', async () => {
    await plugin.open();

    {
      // TODO(burdon): Create mutations and wait for epoch to be triggered.
      const space = await client.spaces.create();
      expect(space.key).to.exist;

      // TODO(burdon): Race condition if attempting to close while space waiting to be ready.
      await sleep(100);
    }

    await plugin.close();
  });

  test('id', async () => {
    expect(plugin.id).to.equal('dxos.org/agent/plugin/epoch-monitor');
  });
});
