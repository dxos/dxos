//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { type Client } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { createInitializedClientsWithContext, testSpaceAutomerge, waitForSpace } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { Invitation, QueryInvitationsResponse } from '@dxos/protocols/proto/dxos/client/services';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

// Mirror of `spaces-invitations.test.ts`, run with `useSubduction: true`. Subduction
// is the sedimentree-based byte transport (see `.claude/skills/effect/subduction/SKILL.md`)
// and is wired by setting `runtime.client.edgeFeatures.subductionReplicator`. With no
// edge connection configured, this exercises Subduction over the in-memory mesh
// transport — the same path used by client↔client invitations in production once the
// feature flag is on.
// File-level timeout: subduction invitation tests do real cryptographic admission
// + sedimentree byte transport between 2-4 clients. Each completes in ~1-2s on dev
// machines but consistently brushes against vitest's 5s default under CI worker
// contention — bump for the whole describe to keep the suite stable.
// TODO(mykola): subduction wasm/network tests are flaky on CI runners
// (limited concurrency, signal-server timing). Re-enable once the suite
// is stable in CI.
describe.skipIf(process.env.CI)('Spaces/invitations (subduction)', { timeout: 30_000 }, () => {
  test('creates a space and invites a peer', async ({ expect }) => {
    const [client1, client2] = await createInitializedClients(2);
    await Promise.all([client1, client2].map((c) => c.addTypes([TestSchema.Expando])));

    log('initialized');

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1, guest: client2.spaces }),
    );
    expect(guestInvitation?.spaceKey).to.deep.eq(space1.key);
    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

    {
      const space = await waitForSpace(client2, guestInvitation!.spaceKey!, { ready: true });
      await testSpaceAutomerge(expect, space.db);
    }
  });

  describe('delegated', () => {
    test('single-use', async ({ expect }) => {
      const clients = await createInitializedClients(3);
      const [alice, bob, fred] = clients;

      // Alice invites Bob.
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: false,
      });
      await bobInvitations.waitForInvitation(observableInvitation.get());
      // Alice leaves.
      await alice.destroy();
      // Bob admits Fred.
      const fredInvitations = createInvitationTracker(fred);
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Invitation gets disposed.
      await bobInvitations.waitEmpty();
      // Fred sees disposal as well.
      await sleep(20);
      await fredInvitations.waitEmpty();
    });

    test('multi-use', async ({ expect }) => {
      const clients = await createInitializedClients(4);
      const [alice, bob, fred, charlie] = clients;

      // Alice invites Bob.
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: true,
      });
      await bobInvitations.waitForInvitation(observableInvitation.get());
      await alice.destroy();
      // Bob admits Fred
      const fredInvitations = createInvitationTracker(fred);
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Fred can also handle the invitation now.
      await fredInvitations.waitForInvitation(observableInvitation.get());
      // Charlie gets admitted using the same invitation after some time.
      await sleep(10);
      charlie.spaces.join(observableInvitation.get());
      await waitForSpace(charlie, space.key!, { ready: true });
    });
  });

  test('locked space stores membership policy correctly', async ({ expect }) => {
    const [client1] = await createInitializedClients(1);

    const space = await client1.spaces.create({}, { membershipPolicy: MembershipPolicy.LOCKED });
    expect(space.membershipPolicy).toEqual(MembershipPolicy.LOCKED);

    const credentials = await space.internal.getCredentials();
    const genesisCredential = credentials.find(
      (c) => c.subject.assertion['@type'] === 'dxos.halo.credentials.SpaceGenesis',
    );
    expect(genesisCredential).toBeDefined();
    expect(genesisCredential!.subject.assertion.membershipPolicy).toEqual(MembershipPolicy.LOCKED);
  });

  const createInvitationTracker = (peer: Client) => {
    let awaitedInvitationId: string | null = null;
    const onInvitationAppeared = new Trigger();
    const invitationIds = new Set();
    const invitationsEmpty = new Trigger();
    const invitationStream = peer.services.services.InvitationsService!.queryInvitations();
    onTestFinished(() => invitationStream.close());
    invitationStream.subscribe((msg) => {
      if (msg.type === QueryInvitationsResponse.Type.ACCEPTED) {
        return;
      }
      if (msg.action === QueryInvitationsResponse.Action.ADDED) {
        msg.invitations?.forEach((inv) => invitationIds.add(inv.invitationId));
        if (awaitedInvitationId != null && invitationIds.has(awaitedInvitationId)) {
          awaitedInvitationId = null;
          onInvitationAppeared.wake();
        }
      } else if (msg.action === QueryInvitationsResponse.Action.REMOVED) {
        msg.invitations?.forEach((inv) => invitationIds.delete(inv.invitationId));
        if (invitationIds.size > 0) {
          invitationsEmpty.wake();
        }
      }
    });
    return {
      get invitations() {
        return invitationIds;
      },
      waitEmpty: (): Promise<void> => {
        if (invitationIds.size === 0) {
          return Promise.resolve();
        }
        invitationsEmpty.reset();
        return invitationsEmpty.wait();
      },
      waitForInvitation: (invitation: Invitation) => {
        if (invitationIds.has(invitation.invitationId)) {
          return Promise.resolve();
        }
        awaitedInvitationId = invitation.invitationId;
        onInvitationAppeared.reset();
        return onInvitationAppeared.wait();
      },
    };
  };

  const createInitializedClients = (count: number): Promise<Client[]> => {
    const context = new Context();
    onTestFinished(async () => {
      await context.dispose();
    });
    return createInitializedClientsWithContext(context, count, {
      config: new Config({
        runtime: {
          client: {
            edgeFeatures: {
              subductionReplicator: true,
            },
          },
        },
      }),
    });
  };
});
