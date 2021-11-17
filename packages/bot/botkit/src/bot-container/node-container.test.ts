//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';

import { TEST_ECHO_TYPE } from '../bots';
import { setupClient, setupBroker, BrokerSetup } from '../testutils';
import { createIpcPort, NodeContainer } from './node-container';
import { fork } from 'child_process';
import { createRpcClient } from '@dxos/rpc';
import { schema } from '../proto/gen';

const log = debug('dxos:botkit:node-container:test')

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

  it('Starts an empty node bot 2', async () => {
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
      const { broker, config } = brokerSetup;
      const { client, invitation, secret } = await setupClient(config);

      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const handle = await container.spawn({
        localPath: require.resolve('../bots/client-bot')
      });

      await handle.open();
      await handle.rpc.Initialize({
        config: JSON.stringify(config),
        invitation: {
          data: invitation
        },
        secret
      });

      await handle.rpc.Stop();
      handle.close();
      container.killAll();
      await client.destroy();
      await broker.stop();
    });

    it('Starts a client bot 2', async () => {
      const { broker, config } = brokerSetup;
      const { client, invitation, secret } = await setupClient(config);

      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const handle = await container.spawn({
        localPath: require.resolve('../bots/client-bot')
      });

      await handle.open();
      await handle.rpc.Initialize({
        config: JSON.stringify(config),
        invitation: {
          data: invitation
        },
        secret
      });

      await handle.rpc.Stop();
      handle.close();
      container.killAll();
      await client.destroy();
      await broker.stop();
    });

    it('Starts an echo-bot', async () => {
      const { broker, config } = brokerSetup;
      const { client, party, invitation, secret } = await setupClient(config);

      const container = new NodeContainer(['ts-node/register/transpile-only']);
      const handle = await container.spawn({
        localPath: require.resolve('../bots/echo-bot')
      });

      await handle.open();
      await handle.rpc.Initialize({
        config: JSON.stringify(config),
        invitation: {
          data: invitation
        },
        secret
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
      await broker.stop();
    });
  });
});

describe.only('IPC port', () => {
  for(let i = 0; i < 2; i++) {
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
  
      // log('Openning RPC...')
      await rpc.open();
      log('Done openning RPC')

  
      const command = PublicKey.random().asUint8Array();
      log('Sending command..')
      const { response } = await rpc.rpc.Command({ command });
      log('Done sending command')
      assert(response);
      expect(PublicKey.from(response).toString()).toBe(PublicKey.from(command).toString());
  
      assert(child.kill(), 'Kill failed.');
    });
  }
});
