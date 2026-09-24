//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { failedInvariant } from '@dxos/invariant';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { fromPublicKey } from '@dxos/protocols/buf';
import { Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { openAndClose } from '@dxos/test-utils';

import * as SqliteStorage from '../../SqliteStorage.ts';
import { IdentityServiceImpl } from '../identity/identity-service.ts';
import { type ServiceContext, createServiceContext, performInvitation } from '../testing/index.ts';

describe('services/ServiceContext', () => {
  test('new space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = await createOpenServiceContext(networkContext);
    await device1.createIdentity();

    const device2 = await createOpenServiceContext(networkContext);
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation_Kind.DEVICE } }));

    const space1 = await device1.dataSpaceManager!.createSpace(new Context());
    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);
  });

  test('joined space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = await createOpenServiceContext(networkContext);
    await device1.createIdentity();

    const device2 = await createOpenServiceContext(networkContext);
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation_Kind.DEVICE } }));

    const identity2 = await createOpenServiceContext(networkContext);
    await identity2.createIdentity();
    const space1 = await identity2.dataSpaceManager!.createSpace(new Context());
    await Promise.all(
      performInvitation({
        host: identity2,
        guest: device1,
        options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(space1.key) },
      }),
    );

    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);
  });

  test('a device that deleted its identity in place inherits the spaces of the identity it joins', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = await createOpenServiceContext(networkContext);
    await device1.createIdentity();
    const space1 = await (device1.dataSpaceManager ?? failedInvariant()).createSpace(new Context());

    const device2 = await createOpenServiceContext(networkContext);
    await device2.createIdentity();
    await deleteIdentity(device2);

    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation_Kind.DEVICE } }));

    const dataSpaceManager2 = device2.dataSpaceManager ?? failedInvariant();
    await dataSpaceManager2.waitUntilSpaceReady(space1.key);
    const space2 = dataSpaceManager2.spaces.get(space1.key) ?? failedInvariant();
    await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);
  });

  const deleteIdentity = (serviceContext: ServiceContext) =>
    EffectEx.runPromise(
      new IdentityServiceImpl(
        serviceContext.identityManager,
        serviceContext.recoveryManager,
        serviceContext.keyring,
        serviceContext.dataSpaceManager ?? failedInvariant(),
        () => serviceContext.runSql(SqliteStorage.wipeSqliteStorage.pipe(Effect.orDie)),
        (options) => serviceContext.createIdentity(options),
      )['IdentityService.deleteIdentity'](),
    );

  const createOpenServiceContext = async (networkContext: MemorySignalManagerContext) => {
    const serviceContext = await createServiceContext({
      signalManagerFactory: async () => new MemorySignalManager(networkContext),
    });
    await openAndClose(serviceContext);
    return serviceContext;
  };
});
