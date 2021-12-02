//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import fs from 'fs';
import path from 'path';

import { createId, PublicKey } from '@dxos/crypto';
import { createLinkedPorts } from '@dxos/rpc';

import { NodeContainer } from './bot-container';
import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';
import { buildBot } from './botkit';
import { TEST_ECHO_TYPE } from './bots';
import { BotFactoryClient, setupBroker, setupClient } from './testutils';

describe('Build bot', () => {
  let outfile: string;
  const botPath = './bots/start-echo-bot.ts';
  const outdir = path.join(require.resolve('.'), '..', '..', 'out');

  before(() => {
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir);
    }
  });

  beforeEach(() => {
    outfile = path.join(outdir, createId() + '.js');
  });

  afterEach(() => {
    fs.unlinkSync(outfile);
  });

  it('Build benchmark', async () => {
    await buildBot({
      entryPoint: require.resolve(botPath),
      outfile
    });
  });

  it('Builds and runs a test bot', async () => {
    await buildBot({
      entryPoint: require.resolve(botPath),
      outfile
    });

    const { broker, config } = await setupBroker();
    const { client, party, invitation, secret } = await setupClient(config);

    const [agentPort, botControllerPort] = createLinkedPorts();

    const botContainer = new NodeContainer(['ts-node/register/transpile-only']);
    const botFactory = new BotFactory(botContainer, config);
    const botController = new BotController(botFactory, botControllerPort);
    const botFactoryClient = new BotFactoryClient(agentPort);

    await Promise.all([
      botController.start(),
      botFactoryClient.start()
    ]);

    const { id } = await botFactoryClient.botFactory.SpawnBot({
      package: {
        localPath: outfile
      },
      invitation: {
        invitationCode: invitation,
        secret
      }
    });
    assert(id);

    const command = PublicKey.random().asUint8Array();
    await botFactoryClient.botFactory.SendCommand({
      botId: id,
      command
    });

    const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
    const payload = item.model.getProperty('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    await botFactoryClient.botFactory.Destroy();
    botFactoryClient.stop();
    botContainer.killAll();
    await broker.stop();
    await client.destroy();
  }).timeout(60000);
});
