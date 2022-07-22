//
// Copyright 2021 DXOS.org
//

import { fork } from 'child_process';
import expect from 'expect';
import { existsSync } from 'fs';
import assert from 'node:assert';
import { join } from 'path';

import { createId } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { TEST_ECHO_TYPE } from '../bots';
import { schema } from '../proto/gen';
import { BotService } from '../proto/gen/dxos/bot';
import { setupClient, setupBroker, BrokerSetup } from '../testutils';
import { createIpcPort, NodeContainer } from './node-container';

const createBotRpcClient = async (port: RpcPort): Promise<ProtoRpcClient<BotService>> => {
  const rpc = createRpcClient(
    schema.getService('dxos.bot.BotService'),
    {
      port,
      timeout: 20_000 // TODO(dmaretskyi): Turn long-running RPCs into streams and shorten the timeout.
    }
  );
  await rpc.open();
  return rpc;
};

describe('Node container', function () {
  // Running node command can be slow.
  this.timeout(20000);

  it('Starts an empty node bot', async () => {
    const container = new NodeContainer(['@swc-node/register']);

    const id = createId();
    const logFilePath = join('/tmp', `${id}.log`);
    const port = await container.spawn({
      id,
      localPath: require.resolve('../bots/empty-bot'),
      logFilePath
    });

    const rpcClient = await createBotRpcClient(port);
    await rpcClient.rpc.initialize({});
    const command = PublicKey.random();
    const { response } = await rpcClient.rpc.command({ command: command.asUint8Array() });
    assert(response);
    expect(PublicKey.from(response).toString()).toBe(command.toString());

    expect(existsSync(logFilePath)).toBe(true);

    await rpcClient.rpc.stop();
    rpcClient.close();
  });

  describe('With signal server', () => {
    let brokerSetup: BrokerSetup;

    before(async () => {
      brokerSetup = await setupBroker();
    });

    after(() => brokerSetup.broker.stop());

    it('Starts a client bot', async () => {
      const { config } = brokerSetup;
      const { client, invitation } = await setupClient(config);

      const container = new NodeContainer(['@swc-node/register']);
      const id = createId();
      const logFilePath = join('/tmp', `${id}.log`);
      const port = await container.spawn({
        id,
        localPath: require.resolve('../bots/start-client-bot'),
        logFilePath
      });

      const rpcClient = await createBotRpcClient(port);
      await rpcClient.rpc.initialize({
        config: config.values,
        invitation
      });

      await rpcClient.rpc.stop();
      rpcClient.close();
      await client.destroy();
    });

    it('Starts an echo-bot', async () => {
      const { config } = brokerSetup;
      const { client, party, invitation } = await setupClient(config);

      const container = new NodeContainer(['@swc-node/register']);
      const id = createId();
      const logFilePath = join('/tmp', `${id}.log`);
      const port = await container.spawn({
        id,
        localPath: require.resolve('../bots/start-echo-bot'),
        logFilePath
      });

      const rpcClient = await createBotRpcClient(port);
      await rpcClient.rpc.initialize({
        config: config.values,
        invitation
      });
      const command = PublicKey.random().asUint8Array();
      await rpcClient.rpc.command({ command: command });

      const item = await party.database.waitForItem<ObjectModel>({ type: TEST_ECHO_TYPE });
      const payload = item.model.get('payload');
      expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

      await rpcClient.rpc.stop();
      container.killAll();
      await client.destroy();
    });
  });

  it('Detects when the bot crashes', async () => {
    const container = new NodeContainer(['@swc-node/register']);

    const id = createId();
    const port = await container.spawn({
      id,
      localPath: require.resolve('../bots/failing-bot')
    });
    const rpcClient = await createBotRpcClient(port);
    await rpcClient.rpc.initialize({});

    const promise = container.exited.waitForCount(1);

    void rpcClient.rpc.command({}).catch(() => {}); // This will hang because the bot has crashed.

    const [, status] = await promise;
    expect(status.code).toBe(255);
    expect(status.signal).toBe(null);

    rpcClient.close();
  });

  describe('IPC port', () => {
    for (let i = 0; i < 2; i++) {
      it(`test #${i}`, async () => {
        const child = fork(require.resolve('../bots/empty-bot'), [], {
          execArgv: ['-r', '@swc-node/register'],
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
        const { response } = await rpc.rpc.command({ command });
        assert(response);
        expect(PublicKey.from(response).toString()).toBe(PublicKey.from(command).toString());

        assert(child.kill(), 'Kill failed.');
      });
    }
  });
});
