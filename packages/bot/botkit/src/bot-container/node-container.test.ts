//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { fork } from 'child_process';
import expect from 'expect';

import { PublicKey } from '@dxos/crypto';
import { createRpcClient } from '@dxos/rpc';

import { TEST_ECHO_TYPE } from '../bots';
import { schema } from '../proto/gen';
import { setupClient, setupBroker, BrokerSetup } from '../testutils';
import { createIpcPort, NodeContainer } from './node-container';

describe('Node container', () => {
  it('Starts an empty node bot', async () => {
    const container = new NodeContainer(['ts-node/register/transpile-only']);
    const handle = await container.spawn({
      localPath: require.resolve('../bots/empty-bot')
    });

    await handle.open();
    await handle.rpc.Initialize({});
    const command = PublicKey.random();
    const { response } = await handle.rpc.Command({ command: command.asUint8Array() });
    assert(response);
    expect(PublicKey.from(response).toString()).toBe(command.toString());

    container.killAll();
  });

  describe('With signal server', () => {
    let brokerSetup: BrokerSetup;

    before(async () => {
      brokerSetup = await setupBroker();
    });

    after(() => brokerSetup.broker.stop());

    it('Starts a client bot', async () => {
      const { config } = brokerSetup;
      const { client, invitation, secret } = await setupClient(config);

      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const handle = await container.spawn({
        localPath: require.resolve('../bots/client-bot')
      });

      await handle.open();
      await handle.rpc.Initialize({
        config,
        invitation: {
          invitationCode: invitation,
          secret
        }
      });

      await handle.rpc.Stop();
      await handle.close();
      container.killAll();
      await client.destroy();
    });

    it('Starts an echo-bot', async () => {
      const { config } = brokerSetup;
      const { client, party, invitation, secret } = await setupClient(config);

      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const handle = await container.spawn({
        localPath: require.resolve('../bots/echo-bot')
      });

      await handle.open();
      await handle.rpc.Initialize({
        config,
        invitation: {
          invitationCode: invitation,
          secret
        }
      });
      const command = PublicKey.random().asUint8Array();
      await handle.rpc.Command({ command: command });

      await party.database.waitForItem({
        type: TEST_ECHO_TYPE
      });

      const items = party.database.select(s => s
        .filter({ type: TEST_ECHO_TYPE })
        .items
      ).getValue();

      expect(items.length).toBe(1);
      const payload = items[0].model.getProperty('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

      await handle.rpc.Stop();
      container.killAll();
      await client.destroy();
    });
  });
});

describe('IPC port', () => {
  for (let i = 0; i < 2; i++) {
    it(`test #${i}`, async () => {
      const child = fork(require.resolve('../bots/empty-bot'), [], {
        execArgv: ['-r', 'ts-node/register/transpile-only'],
        serialization: 'advanced',
        stdio: 'inherit'
      });

      const port = createIpcPort(child);

      const rpc = createRpcClient(
        schema.getService('dxos.bot.BotService'),
        {
          port
        }
      );

      await rpc.open();

      const command = PublicKey.random().asUint8Array();
      const { response } = await rpc.rpc.Command({ command });
      assert(response);
      expect(PublicKey.from(response).toString()).toBe(PublicKey.from(command).toString());

      assert(child.kill(), 'Kill failed.');
    });
  }
});
