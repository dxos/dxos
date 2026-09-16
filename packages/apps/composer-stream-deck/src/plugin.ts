//
// Copyright 2026 DXOS.org
//

import streamDeck from '@elgato/streamdeck';

import * as Protocol from '@dxos/plugin-stream-deck/Protocol';

import { FavoriteAction } from './actions/FavoriteAction.ts';
import { MonitorAction } from './actions/MonitorAction.ts';
import { BridgeServer } from './server/index.ts';

const favorites = new FavoriteAction();
const monitors = new MonitorAction();

const server = new BridgeServer({
  device: Protocol.streamDeckPlus,
  onFrame: async (frame) => {
    await favorites.apply(frame.keys);
    await monitors.apply(frame.dials);
  },
  onDisconnect: async () => {
    await favorites.clear();
    await monitors.clear();
  },
  log: (message, context) => streamDeck.logger.info(message, context),
});

const host = {
  input: (input: Omit<Protocol.Input, '_tag'>) => server.send({ _tag: 'input', ...input }),
  connected: () => server.connected,
};

favorites.bind(host);
monitors.bind(host);

streamDeck.actions.registerAction(favorites);
streamDeck.actions.registerAction(monitors);

await streamDeck.connect();
await server.listen();
