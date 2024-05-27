//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import yaml from 'yaml';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { schema } from '@dxos/protocols';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { createProtoRpcPeer } from '@dxos/rpc';
import { afterTest, describe, test } from '@dxos/test';

import { CHANNEL_NAME, DashboardPlugin, getGossipRPCPort } from './plugin';

describe('DashboardPlugin', () => {
  test('Query status', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const services1 = builder.createLocalClientServices();
    const client1 = new Client({
      services: services1,
      config: new Config({
        runtime: { agent: { plugins: [{ id: 'dxos.org/agent/plugin/dashboard', enabled: true }] } },
      }),
    });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-dashboard-plugin' });

    const dashboardPlugin = new DashboardPlugin();
    await dashboardPlugin.initialize({ client: client1, clientServices: services1 });
    await dashboardPlugin.open();
    afterTest(() => dashboardPlugin.close());

    const services2 = builder.createLocalClientServices();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    afterTest(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    await asyncTimeout(client2.spaces.isReady.wait(), 1000);
    await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);
    const dashboardProxy = createProtoRpcPeer({
      requested: {
        DashboardService: schema.getService('dxos.agent.dashboard.DashboardService'),
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      port: getGossipRPCPort({ space: client2.spaces.default, channelName: CHANNEL_NAME }),
      encodingOptions: {
        preserveAny: true,
      },
    });
    await dashboardProxy.open();
    afterTest(() => dashboardProxy.close());

    const result = new Trigger<AgentStatus>();

    const stream = dashboardProxy.rpc.DashboardService.status();
    afterTest(() => stream.close());

    stream.subscribe((msg) => {
      result.wake(msg);
    });
    await stream.waitUntilReady();

    const message = await asyncTimeout(result.wait(), 1000);
    expect(message.status === AgentStatus.Status.ON);
  }).tag('flaky');

  test('id', async () => {
    const plugin = new DashboardPlugin();
    expect(plugin.id).to.equal('dxos.org/agent/plugin/dashboard');
  });

  test('yaml parsing preserves comments', async () => {
    const yamlObject = yaml.parseDocument(yamlString);
    yamlObject.setIn(['nested', 'b'], 3);
    expect(yamlObject.toString()).to.equal(yamlString.replace('b: 2', 'b: 3'));
  });
});

const yamlString = `\
# Comment1
a: 1
# Comment2
nested:
  # Comment3
  b: 2 # Comment4
`;
