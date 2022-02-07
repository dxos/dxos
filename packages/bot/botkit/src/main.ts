//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';
import { createApiPromise, RegistryClient } from '@dxos/registry-client';

import { NodeContainer } from './bot-container';
import { BotFactory, BotController, DXNSContentResolver, ContentResolver, ContentLoader, IPFSContentLoader } from './bot-factory';
import { getConfig } from './config';

const log = debug('dxos:botkit:bot-factory:main');

const main = async () => {
  const config = getConfig();

  // TODO(yivlad): ts-node -> swc
  const botContainer = new NodeContainer(['ts-node/register/transpile-only']);

  const dxnsServer = config.get('runtime.services.dxns.server');
  let contentResolver: ContentResolver | undefined;
  if (dxnsServer) {
    const apiPromise = await createApiPromise(dxnsServer);
    const registry = new RegistryClient(apiPromise);
    contentResolver = new DXNSContentResolver(registry);
  }

  const ipfsGateway = config.get('runtime.services.ipfs.gateway');
  let contentLoader: ContentLoader | undefined;
  if (ipfsGateway) {
    contentLoader = new IPFSContentLoader(ipfsGateway);
  }

  const botFactory = new BotFactory({
    botContainer,
    config,
    contentResolver,
    contentLoader
  });

  const signal = config.get('runtime.services.signal.server');
  assert(signal, 'Signal server must be provided');
  const networkManager = new NetworkManager({
    signal: [signal]
  });
  const topicString = config.get('runtime.services.bot.topic');
  assert(topicString, 'Topic must be provided');

  const topic = PublicKey.from(topicString);
  const controller = new BotController(botFactory, networkManager);
  await controller.start(topic);

  log(`Listening on ${topic}`);
};

void main();
