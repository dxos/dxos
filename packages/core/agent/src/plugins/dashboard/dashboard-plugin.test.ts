//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { DashboardResponse } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { afterTest, describe, test } from '@dxos/test';

import { CHANNEL_NAME, DashboardPlugin } from './dashboard-plugin';

describe('DashboardPlugin', () => {
  test('request/response', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const services1 = builder.createLocal();
    const client1 = new Client({
      services: services1,
      config: new Config({ runtime: { agent: { plugins: { dashboard: { enabled: true } } } } }),
    });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-dashboard-plugin' });

    const dashboard = new DashboardPlugin();
    await dashboard.initialize({ client: client1, clientServices: services1, plugins: [] });
    await dashboard.open();
    afterTest(() => dashboard.close());

    const services2 = builder.createLocal();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    afterTest(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    // Subscribe for response.
    const results = new Trigger<GossipMessage>();
    {
      await asyncTimeout(client2.spaces.isReady.wait(), 1000);

      await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);

      const subs = client2.spaces.default.listen(CHANNEL_NAME, (message) => results.wake(message));
      afterTest(() => subs());
    }

    // Send request.
    {
      await client2.spaces.default.postMessage(CHANNEL_NAME, {
        '@type': 'dxos.agent.dashboard.DashboardRequest',
      });
    }

    const message = await asyncTimeout(results.wait(), 1000);
    expect(message.payload['@type']).to.equal('dxos.agent.dashboard.DashboardResponse');
    expect(message.payload.status === DashboardResponse.Status.ON);
  });
});
