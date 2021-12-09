//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import fs from 'fs';
import path from 'path';

import { generateInvitation } from '@dxos/bot-factory-client';
import { createId, PublicKey } from '@dxos/crypto';

import { buildBot } from '.';
import { NodeContainer } from '../bot-container';
import { BotFactory } from '../bot-factory';
import { TEST_ECHO_TYPE } from '../bots';
import { setupBroker, setupClient } from '../testutils';

describe('Build bot', () => {
  let outfile: string;
  const botPath = require.resolve('../bots/start-echo-bot.ts');
  const outdir = path.join(__dirname, '../../out/bots');

  before(() => {
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
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
      entryPoint: botPath,
      outfile
    });
  });

  it('Builds and runs a test bot', async () => {
    await buildBot({
      entryPoint: botPath,
      outfile
    });

    const { broker, config } = await setupBroker();
    const { client, party } = await setupClient(config);

    const botContainer = new NodeContainer();
    const botFactory = new BotFactory(botContainer, config);
    const botHandle = await botFactory.SpawnBot({
      package: { localPath: outfile },
      invitation: await generateInvitation(client, party)
    });

    const command = PublicKey.random().asUint8Array();
    await botFactory.SendCommand({
      botId: botHandle.id,
      command
    });

    const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
    const payload = item.model.getProperty('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    botContainer.killAll();
    await broker.stop();
    await client.destroy();
  }).timeout(60000);
});
