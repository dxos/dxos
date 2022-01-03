//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';
import assert from 'assert';

import { NodeContainer } from './bot-container';
import { BotFactory, BotController } from './bot-factory';
import { getConfig } from './config';

const main = async () => {
  const config = getConfig();
  assert(config.get('version') === undefined, 'Only config v0 is supported');

  const botContainer = new NodeContainer(['ts-node/register/transpile-only']);
  const botFactory = new BotFactory({
    botContainer,
    config
  });

  const signal = config.get('services.signal.server');
  assert(signal, 'Signal server must be provided');
  const networkManager = new NetworkManager({
    signal: [signal]
  });
  const topicString = config.get('services.bot.topic');
  assert(topicString, 'Topic must be provided');

  const topic = PublicKey.from(topicString);
  const controller = new BotController(botFactory, networkManager);
  await controller.start(topic);

  console.log(`Listening on ${topic}`);
};

void main();
