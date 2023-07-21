//
// Copyright 2023 DXOS.org
//

import { MemorySignalManagerContext } from '@dxos/messaging';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test } from '@dxos/test';

import { createServiceContext, syncItemsLocal } from '../testing';
import { performInvitation } from '../testing/invitation-utils';

describe('services/ServiceContext', () => {
  test('existing space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();
    const space1 = await device1.dataSpaceManager!.createSpace();

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  });

  test('new space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    const space1 = await device1.dataSpaceManager!.createSpace();
    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  }).tag('flaky');

  test('joined space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    const identity2 = createServiceContext({ signalContext: networkContext });
    await identity2.createIdentity();
    const space1 = await identity2.dataSpaceManager!.createSpace();
    await Promise.all(
      performInvitation({
        host: identity2,
        guest: device1,
        options: { kind: Invitation.Kind.SPACE, spaceKey: space1.key },
      }),
    );

    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  });
});
