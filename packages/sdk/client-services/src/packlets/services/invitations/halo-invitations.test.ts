//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { MemorySignalManagerContext } from '@dxos/messaging';
import { afterTest } from '@dxos/testutils';

import { createServiceContext } from '../testing';

describe('services/halo', function () {
  it('creates identity', async function () {
    const peer = await createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    const identity = await peer.createIdentity();
    expect(identity).not.to.be.undefined;
  });

  it('invitations', async function () {
    const signalContext = new MemorySignalManagerContext();

    const peer1 = await createServiceContext({ signalContext });
    const peer2 = await createServiceContext({ signalContext });
    await peer1.open();
    await peer2.open();
    afterTest(() => peer1.close());
    afterTest(() => peer2.close());

    const identity1 = await peer1.createIdentity();
    expect(peer1.identityManager.identity).to.eq(identity1);
    expect(peer2.identityManager.identity).to.be.undefined;

    const invitation = await peer1.haloInvitations.createInvitation();
    const identity2 = await peer2.haloInvitations.acceptInvitation(invitation);
    expect(identity2.identityKey).to.deep.eq(identity1.identityKey);
  });
});
