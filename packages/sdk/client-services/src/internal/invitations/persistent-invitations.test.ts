//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { fromPublicKey } from '@dxos/protocols/buf';
import { Invitation_AuthMethod, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { ServiceContext, createIdentity, createPeers, performInvitation } from '../testing/index.ts';

const closeAfterTest = (peer: ServiceContext) => {
  onTestFinished(() => peer.close());
  return peer;
};

/**
 * Opens a space the way a client does after a restart, and waits for it to be ready.
 */
const activateSpace = async (peer: ServiceContext, spaceKey: PublicKey) => {
  const dataSpaceManager = peer.dataSpaceManager;
  invariant(dataSpaceManager);
  const space = dataSpaceManager.spaces.get(spaceKey);
  invariant(space);
  await space.activate(new Context());
  await dataSpaceManager.waitUntilSpaceReady(spaceKey);
};

describe('persistent invitations', () => {
  test('a reloaded invitation is hosted once its space is ready', async ({ expect }) => {
    // Not `createPeers`: its contexts drop their storage on close, and this test reopens the same profile.
    const peer = new ServiceContext({ signalManager: new MemorySignalManager(new MemorySignalManagerContext()) });
    onTestFinished(() => peer.destroy());
    await peer.open(new Context());
    await peer.createIdentity();

    invariant(peer.dataSpaceManager);
    const space = await peer.dataSpaceManager.createSpace(new Context());
    await peer.dataSpaceManager.waitUntilSpaceReady(space.key);
    const invitation = await peer.invitationsManager.createInvitation(new Context(), {
      kind: Invitation_Kind.SPACE,
      spaceKey: fromPublicKey(space.key),
      authMethod: Invitation_AuthMethod.NONE,
      persistent: true,
      multiUse: true,
    });
    const { invitationId } = invitation.get();
    expect(peer.metadataStore.getInvitations().map((saved) => saved.invitationId)).toEqual([invitationId]);

    // Restart: the persisted invitation is loaded when the stack opens, while the space is listed but closed
    // (it has no member state yet, so the host's permission check cannot pass).
    await peer.close();
    await peer.open(new Context());
    expect(peer.metadataStore.getInvitations().map((saved) => saved.invitationId)).toEqual([invitationId]);
    expect(peer.invitationsManager.getCreatedInvitations()).toHaveLength(0);

    await activateSpace(peer, space.key);
    await expect
      .poll(() => peer.invitationsManager.getCreatedInvitations().map((created) => created.invitationId))
      .toEqual([invitationId]);

    const [restored] = peer.invitationsManager.getCreatedInvitations();
    expect(restored.persistent).toBe(true);
    expect(peer.metadataStore.getInvitations().map((saved) => saved.invitationId)).toEqual([invitationId]);

    // Shutting down does not end a restored invitation: it is hosted again on the next start.
    await peer.close();
    await peer.open(new Context());
    expect(peer.metadataStore.getInvitations().map((saved) => saved.invitationId)).toEqual([invitationId]);
    await activateSpace(peer, space.key);
    await expect
      .poll(() => peer.invitationsManager.getCreatedInvitations().map((created) => created.invitationId))
      .toEqual([invitationId]);

    // A restored invitation is still removed from storage when it ends.
    await peer.invitationsManager.cancelInvitation({ invitationId });
    expect(peer.metadataStore.getInvitations()).toHaveLength(0);
  });

  test('a restored multi-use invitation stays persisted after it admits a guest', async ({ expect }) => {
    const signalContext = new MemorySignalManagerContext();
    const host = new ServiceContext({ signalManager: new MemorySignalManager(signalContext) });
    onTestFinished(() => host.destroy());
    await host.open(new Context());
    await host.createIdentity();
    const [guest] = await Promise.all(
      (await createPeers(1, async () => new MemorySignalManager(signalContext))).map(closeAfterTest),
    );
    await createIdentity(guest);

    invariant(host.dataSpaceManager);
    const space = await host.dataSpaceManager.createSpace(new Context());
    await host.dataSpaceManager.waitUntilSpaceReady(space.key);
    const invitation = await host.invitationsManager.createInvitation(new Context(), {
      kind: Invitation_Kind.SPACE,
      spaceKey: fromPublicKey(space.key),
      authMethod: Invitation_AuthMethod.NONE,
      persistent: true,
      multiUse: true,
    });
    const { invitationId } = invitation.get();

    await host.close();
    await host.open(new Context());
    await activateSpace(host, space.key);
    await expect
      .poll(() => host.invitationsManager.getCreatedInvitations().map((created) => created.invitationId))
      .toEqual([invitationId]);

    // Admitting a guest leaves a multi-use invitation in SUCCESS; it must still be hosted after the next restart.
    const [hostResult, guestResult] = performInvitation({
      host,
      guest,
      options: { kind: Invitation_Kind.SPACE, invitationId },
    });
    expect((await hostResult).error).toBeUndefined();
    expect((await guestResult).error).toBeUndefined();

    await host.close();
    await host.open(new Context());
    expect(host.metadataStore.getInvitations().map((saved) => saved.invitationId)).toEqual([invitationId]);
  });

  test('a redeemed single-use invitation is removed from storage before the host reports success', async ({
    expect,
  }) => {
    const [host, guest] = await Promise.all((await createPeers(2)).map(closeAfterTest));
    await Promise.all([createIdentity(host), createIdentity(guest)]);

    invariant(host.dataSpaceManager);
    const space = await host.dataSpaceManager.createSpace(new Context());
    await host.dataSpaceManager.waitUntilSpaceReady(space.key);

    let savedAtSuccess: number | undefined;
    const [hostResult, guestResult] = performInvitation({
      host,
      guest,
      options: {
        kind: Invitation_Kind.SPACE,
        spaceKey: fromPublicKey(space.key),
        authMethod: Invitation_AuthMethod.NONE,
        persistent: true,
      },
      hooks: {
        host: {
          onSuccess: () => {
            savedAtSuccess = host.metadataStore.getInvitations().length;
          },
        },
      },
    });

    expect((await hostResult).error).toBeUndefined();
    expect((await guestResult).error).toBeUndefined();
    expect(savedAtSuccess).toBe(0);
  });
});
