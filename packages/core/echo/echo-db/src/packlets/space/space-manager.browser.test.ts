//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import { expect } from 'chai';

import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { TestAgentBuilder, WebsocketNetworkManagerProvider } from './testing';

// TODO(burdon): Config.
// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space-manager', function () {
  it('invitations', async function () {
    const builder = new TestAgentBuilder({
      storage: createStorage(),
      networkManagerProvider: WebsocketNetworkManagerProvider(SIGNAL_URL)
    });

    const peer1 = await builder.createPeer();
    const spaceManager1 = peer1.createSpaceManager();
    await spaceManager1.open();

    const peer2 = await builder.createPeer();
    const spaceManager2 = peer2.createSpaceManager();
    await spaceManager2.open();

    afterTest(() => spaceManager1.close());
    afterTest(() => spaceManager2.close());

    const space1 = await spaceManager1.createSpace();
    expect(space1.isOpen).to.be.true;

    // TODO(burdon): Create invitation and join.
    // TODO(burdon): Need to factor out DataInvitations from services.

    // const space2 = await spaceManager2.acceptSpace();
    // expect(space2.key).not.to.be.undefined;
  });
});
