//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import yaml from 'yaml';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { log } from '@dxos/log';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { afterTest, describe, test } from '@dxos/test';

import { DashboardPlugin } from './dashboard-plugin';
import { DashboardProxy } from './dashboard-proxy';

describe('DashboardPlugin', () => {
  test('Query status', async () => {
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

    const dashboardPlugin = new DashboardPlugin({ configPath: '' });
    await dashboardPlugin.initialize({ client: client1, clientServices: services1, plugins: [] });
    await dashboardPlugin.open();
    afterTest(() => dashboardPlugin.close());

    const services2 = builder.createLocal();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    afterTest(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    await asyncTimeout(client2.spaces.isReady.wait(), 1000);
    await asyncTimeout(client1.spaces.default.waitUntilReady(), 1000);
    const dashboardProxy = new DashboardProxy({ client: client2 });
    await dashboardProxy.open();
    afterTest(() => dashboardProxy.close());

    const result = new Trigger<AgentStatus>();

    const stream = dashboardProxy.services.DashboardService.status();
    afterTest(() => stream.close());

    stream.subscribe((msg) => {
      log.info('Got message:', { msg });
      result.wake(msg);
    });
    await stream.waitUntilReady();

    const message = await asyncTimeout(result.wait(), 1000);
    expect(message.status === AgentStatus.Status.ON);
  });

  test('id', async () => {
    const plugin = new DashboardPlugin({ configPath: '' });
    expect(plugin.id).to.equal('dashboard');
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
