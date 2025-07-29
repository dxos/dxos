//
// Copyright 2022 DXOS.org
//

import { describe, expect, test, onTestFinished } from 'vitest';

import { chain } from '@dxos/async';
import { Context } from '@dxos/context';
import { AlreadyJoinedError } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createPeers, createServiceContext, performInvitation } from '../testing';

const closeAfterTest = async (peer: ServiceContext) => {
  onTestFinished(async () => {
    await peer.close();
  });
  return peer;
};

describe('services/device', () => {
  test('creates identity', async () => {
    const peer = await createServiceContext();
    await peer.open(new Context());
    onTestFinished(async () => {
      await peer.close();
    });

    const identity = await peer.createIdentity();
    expect(identity).not.to.be.undefined;
  });

  test('creates and accepts invitation', async () => {
    const [host, guest] = await chain<ServiceContext>([closeAfterTest])(createPeers(2));

    const identity1 = await host.createIdentity();
    expect(host.identityManager.identity).to.eq(identity1);

    await Promise.all(performInvitation({ host, guest, options: { kind: Invitation.Kind.DEVICE } }));
    expect(guest.identityManager.identity?.identityKey).to.deep.eq(identity1.identityKey);
  });

  test('invitation when already joined', async () => {
    const [host, guest] = await chain<ServiceContext>([closeAfterTest])(createPeers(2));

    const identity1 = await host.createIdentity();
    expect(host.identityManager.identity).to.eq(identity1);

    await Promise.all(performInvitation({ host, guest, options: { kind: Invitation.Kind.DEVICE } }));
    expect(guest.identityManager.identity?.identityKey).to.deep.eq(identity1.identityKey);

    const [_, result] = performInvitation({ host, guest, options: { kind: Invitation.Kind.DEVICE } });
    expect((await result).error).to.be.instanceOf(AlreadyJoinedError);
  });
});
