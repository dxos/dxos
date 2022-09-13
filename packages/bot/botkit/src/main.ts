//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { NetworkManager } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';
import { createApiPromise, PolkadotRegistry, RegistryClient } from '@dxos/registry-client';
import { WebsocketSignalManager } from '@dxos/signaling';

import { NodeContainer } from './bot-container';
import { BotFactory, BotController, DXNSContentResolver, ContentResolver, ContentLoader, IPFSContentLoader, FSBotSnapshotStorage } from './bot-factory';
import { BOT_SNAPSHOT_DIR, getConfig } from './config';

const log = debug('dxos:botkit:bot-factory:main');

/**
 * Main script that starts the bot factory.
 * You can pass optional modules for node container via command line arguments.
 * Example: node bin/main.js ts-node/register/transpile-only
 */
const main = async () => {
  const config = getConfig();

  const botContainer = new NodeContainer(process.argv.slice(2));

  const dxnsServer = config.get('runtime.services.dxns.server');
  let contentResolver: ContentResolver | undefined;
  if (dxnsServer) {
    const apiPromise = await createApiPromise(dxnsServer);
    const registry = new RegistryClient(new PolkadotRegistry(apiPromise));
    contentResolver = new DXNSContentResolver(registry);
  }

  const ipfsGateway = config.get('runtime.services.ipfs.gateway');
  let contentLoader: ContentLoader | undefined;
  if (ipfsGateway) {
    contentLoader = new IPFSContentLoader(ipfsGateway);
  }

  const botSnapshotStorage = new FSBotSnapshotStorage(BOT_SNAPSHOT_DIR);

  const botFactory = new BotFactory({
    botContainer,
    config,
    contentResolver,
    contentLoader,
    botSnapshotStorage
  });

  const signal = config.get('runtime.services.signal.server');
  assert(signal, 'Signal server must be provided');
  const networkManager = new NetworkManager({
    // TODO(mykola): SignalManager need to be subscribed for message receiving first.
    signalManager: new WebsocketSignalManager([signal])
  });
  const topicString = config.get('runtime.services.bot.topic');
  assert(topicString, 'Topic must be provided');

  const topic = PublicKey.from(topicString);
  const controller = new BotController(botFactory, networkManager);
  await controller.start(topic);

  await botFactory.init();

  log(`Listening on ${topic}`);
};

void main();
