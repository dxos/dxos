//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=browser

import { createStorage } from '@dxos/random-access-storage';
import { describe, test } from 'vitest';

import { TestAgentBuilder, WebsocketNetworkManagerProvider } from '../testing';

// TODO(burdon): Config.
// Signal server will be started by the setup script.// Signal server will be started by the setup script.
const port = process.env.SIGNAL_PORT ?? 4000;
const SIGNAL_URL = `ws://localhost:${port}/.well-known/dx/signal`;

describe('space-manager', () => {
  test.skip('invitations', async ({ onTestFinished }) => {
    const builder = new TestAgentBuilder({
      storage: createStorage(),
      networkManagerProvider: WebsocketNetworkManagerProvider(SIGNAL_URL),
    });
    onTestFinished(async () => {
      await builder.close();
    });

    const peer1 = await builder.createPeer();
    const spaceManager1 = peer1.spaceManager;
    await spaceManager1.open();

    const peer2 = await builder.createPeer();
    const spaceManager2 = peer2.spaceManager;
    await spaceManager2.open();

    onTestFinished(() => spaceManager1.close());
    onTestFinished(() => spaceManager2.close());

    // const space1 = await spaceManager1.createSpace();
    // expect(space1.isOpen).to.be.true;

    // TODO(burdon): Create invitation and join.
    // TODO(burdon): Need to factor out DataInvitations from services.

    // const space2 = await spaceManager2.acceptSpace();
    // expect(space2.key).not.to.be.undefined; });
  });
});
