//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncChain } from '@dxos/async';
import { describe, test, afterTest } from '@dxos/test';

import { ServiceContext } from '../services';
import { createPeers, createServiceContext } from '../testing';
import { performInvitation } from '../testing/invitaiton-utils';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/halo', () => {
  test('creates identity', async () => {
    const peer = createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    const identity = await peer.createIdentity();
    expect(identity).not.to.be.undefined;
  });

  test('creates and accepts invitation', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));

    const identity1 = await host.createIdentity();
    expect(host.identityManager.identity).to.eq(identity1);

    await performInvitation(host.haloInvitations, guest.haloInvitations, undefined);
    expect(guest.identityManager.identity?.identityKey).to.deep.eq(identity1.identityKey);
  });
});
