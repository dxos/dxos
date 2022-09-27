//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import fs from 'fs';
import path from 'path';

import { createId } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';

import { NodeContainer } from '../bot-container';
import { BotFactory } from '../bot-factory';
import { TEST_ECHO_TYPE } from '../bots';
import { setupBroker, setupClient } from '../testutils';
import { buildBot } from './build-bot';

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
    const { client, party, invitation } = await setupClient(config);

    const botContainer = new NodeContainer(['@swc-node/register']);
    const botFactory = new BotFactory({
      botContainer,
      config
    });
    const botHandle = await botFactory.spawnBot({
      package: { localPath: outfile },
      invitation
    });

    const command = PublicKey.random().asUint8Array();
    await botFactory.sendCommand({
      botId: botHandle.id,
      command
    });

    const item = await party.database.waitForItem<ObjectModel>({ type: TEST_ECHO_TYPE });
    const payload = item.model.get('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    botContainer.killAll();
    await broker.stop();
    await client.destroy();
  }).timeout(60000);
});
