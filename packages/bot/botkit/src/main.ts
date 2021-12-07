//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

import { NodeContainer } from './bot-container';
import { BotController } from './bot-controller';
import { BotFactory } from './bot-factory';

const main = async () => {
  const botContainer = new NodeContainer(['ts-node/register/transpile-only']);
  const botFactory = new BotFactory(botContainer);

  const signal = process.env.DX_SIGNAL_ENDPOINT ?? 'ws://localhost:4000';
  const ice = process.env.DX_ICE_ENDPOINTS;
  const topicString = process.env.DX_BOT_TOPIC ?? 'e61469c04e4265e145f9863dd4b84fd6dee8f31e10160c38f9bb3c289e3c09bc';
  const topic = PublicKey.from(topicString);
  const networkManager = new NetworkManager({
    signal: [signal],
    ice: [ice]
  });
  const controller = new BotController(botFactory, networkManager);
  await controller.start(topic);

  console.log(`Listening on ${topic}`);
};

void main();
