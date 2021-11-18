//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import path from 'path';
import fs from 'fs';

import { createLinkedPorts } from '@dxos/rpc';
import { createId, PublicKey } from '@dxos/crypto';
import { 
  buildBot,
  setupBroker,
  setupClient,
  NodeContainer,
  BotFactoryClient,
  TEST_ECHO_TYPE,
  BotController,
  BotFactory
} from '@dxos/botkit';

describe('Build bot', () => {
  let outfile: string;

  beforeEach(() => {
    outfile = path.join(path.dirname(require.resolve('./bot/main.ts')), createId() + '.js');
  });

  afterEach(() => {
    fs.unlinkSync(outfile);
  });

  it('Builds and runs a test bot', async () => {
    await buildBot({
      entryPoint: require.resolve('./bot/main.ts'),
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
  });
});
