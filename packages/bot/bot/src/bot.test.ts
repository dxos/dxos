//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Config } from '@dxos/config';
import { createId, PublicKey } from '@dxos/crypto';
import { NetworkManager, StarTopology, transportProtocolProvider } from '@dxos/network-manager';
import { BotPlugin } from '@dxos/protocol-plugin-bot';

import { Bot } from './bot';

test('start a bot', async () => {
  const controlTopic = PublicKey.random();

  const networkManager = new NetworkManager();

  const botPlugin = new BotPlugin(controlTopic.asBuffer(), (protocol, message) => {});
  networkManager.joinProtocolSwarm({
    topic: controlTopic,
    peerId: controlTopic,
    topology: new StarTopology(controlTopic),
    protocol: transportProtocolProvider(controlTopic.asBuffer(), controlTopic.asBuffer(), botPlugin)
  });

  const bot = new Bot(new Config({
    bot: {
      uid: createId(),
      cwd: process.cwd(),
      name: 'TestBot',
      controlTopic: controlTopic.toHex()
    },
    services: {
      signal: {
        server: undefined
      },
      ice: undefined
    }
  }));

  await bot.start();

  expect(bot.client).toBeDefined();

  await bot.stop();

  await networkManager.destroy();
}).timeout(45_000);
