//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type PushStream, sleep, Trigger, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, openAndClose, test } from '@dxos/test';
import { range } from '@dxos/util';

import { type InvitationProtocol } from './invitation-protocol';
import { InvitationsHandler } from './invitations-handler';
import { SpaceInvitationProtocol } from './space-invitation-protocol';
import { TestBuilder, type TestPeer } from '../testing';

interface PeerSetup {
  ctx: Context;
  peer: TestPeer;
  sink: StateUpdateSink;
  protocol: InvitationProtocol;
  handler: InvitationsHandler;
  spaceKey: PublicKey;
}

type StateUpdateSink = PushStream<Invitation> & {
  sink: Invitation[];
  lastState: Invitation.State | undefined;
  hasState(startingFrom: number, state: Invitation.State): boolean;
  waitFor(state: Invitation.State): Promise<void>;
};

describe('InvitationHandler', () => {
  let testBuilder: TestBuilder;
  beforeEach(() => {
    testBuilder = new TestBuilder();
  });

  describe('delegated invitations', () => {
    for (const multiUse of [false, true]) {
      test(`base case success multiUse=${multiUse}`, async () => {
        const host = await createPeer();
        const invitation = await createInvitation(host, { multiUse });
        await hostInvitation(host, invitation);

        const guest = await createPeer(host.spaceKey);
        await performAuth(guest, invitation);

        await sleep(15);
        expect(guest.ctx.disposed).to.be.true;
        if (multiUse) {
          expect(host.ctx.disposed).to.be.false;
        } else {
          expect(host.ctx.disposed).to.be.true;
        }
      });
    }

    test('host ctx active on single use invitation timeout', async () => {
      const host = await createPeer();
      const invitation = await createInvitation(host, {
        timeout: 100,
      });
      await hostInvitation(host, invitation);

      const guest = await createPeer(host.spaceKey);
      await acceptInvitation(guest, invitation);

      await guest.sink.waitFor(Invitation.State.READY_FOR_AUTHENTICATION);
      await guest.ctx.dispose();
      await host.sink.waitFor(Invitation.State.TIMEOUT);

      await sleep(25);
      expect(host.ctx.disposed).to.be.false;
    });

    test('invitation success after first guest error', async () => {
      const host = await createPeer();
      const invitation = await createInvitation(host);
      await hostInvitation(host, invitation);

      const badGuest = await createPeer(host.spaceKey);
      await failAuth(badGuest, invitation);
      await badGuest.sink.waitFor(Invitation.State.ERROR);

      const goodGuest = await createPeer(host.spaceKey);
      await performAuth(goodGuest, invitation);
      await host.sink.waitFor(Invitation.State.SUCCESS);

      await sleep(10);
      expect(goodGuest.ctx.disposed).to.be.true;
      expect(host.ctx.disposed).to.be.true;
    });

    test('multiUse invitation with multiple guests', async () => {
      const host = await createPeer();
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);

      const guest1 = await createPeer(host.spaceKey);
      await performAuth(guest1, invitation);
      const guest2 = await createPeer(host.spaceKey);
      await performAuth(guest2, invitation);

      await sleep(5);
      [guest1, guest2].forEach((g) => expect(g.ctx.disposed).to.be.true);
      expect(host.ctx.disposed).to.be.false;
    });

    test('invitation success after host error with another host', async () => {
      const host = await createPeer();
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);
      const anotherHost = await createNewHost(invitation);

      const guest = await createPeer(host.spaceKey);
      const codeInput = await failAuth(guest, invitation);
      while (!guest.ctx.disposed) {
        codeInput.wake(invitation.authCode!);
        await sleep(10);
      }
      await guest.sink.waitFor(Invitation.State.SUCCESS);

      const hostFailed = [host, anotherHost].map((h) => h.sink.hasState(0, Invitation.State.ERROR));
      expect(hostFailed.sort()).to.deep.eq([false, true]);
    });

    test('single guest - many hosts', async () => {
      const hosts: PeerSetup[] = [await createPeer()];
      const [host] = hosts;
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);
      for (let i = 0; i < 4; i++) {
        hosts.push(await createNewHost(invitation));
      }

      const guest = await createPeer(host.spaceKey);
      await performAuth(guest, invitation);
      await guest.sink.waitFor(Invitation.State.SUCCESS);
      await sleep(10);
      expect(guest.ctx.disposed).to.be.true;
    });

    test('guest gives up after trying with three hosts', async () => {
      const hosts: PeerSetup[] = [await createPeer()];
      const [host] = hosts;
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);
      for (let i = 0; i < 2; i++) {
        hosts.push(await createNewHost(invitation));
      }

      const guest = await createPeer(host.spaceKey);
      const codeInput = await acceptInvitation(guest, invitation);
      while (!guest.ctx.disposed) {
        await failCodeInput(guest, codeInput, invitation);
        await sleep(10);
      }

      await sleep(10);
      expect(guest.sink.lastState).to.eq(Invitation.State.ERROR);
    });

    test('single host - many guests', async () => {
      const hosts: PeerSetup[] = [await createPeer()];
      const [host] = hosts;
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);
      const guests = await Promise.all(
        range(5).map(async () => {
          const guest = await createPeer(host.spaceKey);
          await performAuth(guest, invitation);
          return guest;
        }),
      );

      await sleep(10);
      guests.forEach((g) => {
        expect(g.ctx.disposed).to.be.true;
        expect(g.sink.lastState).to.eq(Invitation.State.SUCCESS);
      });
    });

    test('many guests - many hosts', async () => {
      const hosts: PeerSetup[] = [await createPeer()];
      const [host] = hosts;
      const invitation = await createInvitation(host, { multiUse: true });
      await hostInvitation(host, invitation);
      for (let i = 0; i < 4; i++) {
        hosts.push(await createNewHost(invitation));
      }
      const guests = await Promise.all(
        range(5).map(async () => {
          const guest = await createPeer(host.spaceKey);
          await performAuth(guest, invitation);
          return guest;
        }),
      );
      await sleep(10);
      guests.forEach((g) => {
        expect(g.ctx.disposed).to.be.true;
        expect(g.sink.lastState).to.eq(Invitation.State.SUCCESS);
      });
    });

    test('single use invitation - many guests - only one admitted', async () => {
      const host = await createPeer();
      const invitation = await createInvitation(host);
      await hostInvitation(host, invitation);
      const guests = await Promise.all(
        range(5).map(async () => {
          const guest = await createPeer(invitation.spaceKey);
          const authCodeInput2 = await acceptInvitation(guest, invitation);
          authCodeInput2.wake(invitation.authCode!);
          return guest;
        }),
      );

      await waitForCondition({
        condition: () => guests.find((g) => g.sink.lastState === Invitation.State.SUCCESS) != null,
      });
      await sleep(40);
      const success = guests.filter((g) => g.sink.lastState === Invitation.State.SUCCESS);
      expect(success.length).to.eq(1);
    });
  });

  const createPeer = async (spaceKey: PublicKey | null = null): Promise<PeerSetup> => {
    const peer = testBuilder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);
    if (spaceKey == null) {
      const space = await peer.dataSpaceManager.createSpace();
      spaceKey = space.key;
    }
    const invitationHandler = new InvitationsHandler(peer.networkManager, {
      controlHeartbeatInterval: 250, // faster peer failure detection
    });
    const protocol = new SpaceInvitationProtocol(peer.dataSpaceManager, peer.identity, peer.keyring, spaceKey);
    const ctx = new Context();
    afterTest(() => ctx.dispose());
    const sink = newStateUpdateSink();
    return { ctx, sink, peer, protocol, handler: invitationHandler, spaceKey };
  };

  const hostInvitation = async (setup: PeerSetup, invitation: Invitation) => {
    await setup.ctx.dispose();
    setup.ctx = new Context();
    afterTest(() => setup.ctx.dispose());
    setup.handler.handleInvitationFlow(setup.ctx, setup.sink, setup.protocol, invitation);
  };

  const acceptInvitation = async (setup: PeerSetup, invitation: Invitation): Promise<Trigger<string>> => {
    await setup.ctx.dispose();
    setup.ctx = new Context();
    afterTest(() => setup.ctx.dispose());
    const authCodeInput = new Trigger<string>();
    setup.handler.acceptInvitation(setup.ctx, setup.sink, setup.protocol, invitation, authCodeInput);
    return authCodeInput;
  };

  const failAuth = async (setup: PeerSetup, invitation: Invitation) => {
    const wrongAuthCodeInput = await acceptInvitation(setup, invitation);
    await setup.sink.waitFor(Invitation.State.READY_FOR_AUTHENTICATION);
    await failCodeInput(setup, wrongAuthCodeInput, invitation);
    return wrongAuthCodeInput;
  };

  const failCodeInput = async (setup: PeerSetup, codeInput: Trigger<string>, invitation: Invitation): Promise<void> => {
    const checkFrom = setup.sink.sink.length;
    while (
      !setup.ctx.disposed &&
      !setup.sink.hasState(checkFrom, Invitation.State.ERROR) &&
      !setup.sink.hasState(checkFrom, Invitation.State.CONNECTED)
    ) {
      codeInput.wake(invitation.authCode + '1');
      await sleep(20);
    }
  };

  const createNewHost = async (invitation: Invitation): Promise<PeerSetup> => {
    const newHost = await createPeer(invitation.spaceKey!);
    await performAuth(newHost, invitation);
    await sleep(30);
    await hostInvitation(newHost, invitation);
    return newHost;
  };

  const performAuth = async (setup: PeerSetup, invitation: Invitation) => {
    const authCodeInput2 = await acceptInvitation(setup, invitation);
    await setup.sink.waitFor(Invitation.State.READY_FOR_AUTHENTICATION);
    authCodeInput2.wake(invitation.authCode!);
    await setup.sink.waitFor(Invitation.State.SUCCESS);
  };

  const newStateUpdateSink = (): StateUpdateSink => {
    const sink: Invitation[] = [];
    const hasState = (startingIndex: number, state: Invitation.State): boolean => {
      return sink
        .slice(startingIndex)
        .map((i) => i.state)
        .includes(state);
    };
    return {
      sink,
      next: sink.push.bind(sink),
      error: () => {},
      complete: () => {},
      hasState,
      get lastState() {
        return sink[sink.length - 1]?.state;
      },
      waitFor: async (state: Invitation.State): Promise<void> => {
        if (sink[sink.length - 1]?.state === state) {
          return;
        }
        const sliceStart = sink.length;
        await waitForCondition({
          condition: () => hasState(sliceStart, state),
        });
      },
    } as any;
  };

  const createInvitation = async (setup: PeerSetup, options?: Partial<Invitation>): Promise<Invitation> => {
    const observable = await setup.peer.invitationsManager.createInvitation({
      type: Invitation.Type.DELEGATED,
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.SHARED_SECRET,
      spaceKey: setup.spaceKey,
      multiUse: false,
      ...options,
    });
    // cancel to avoid interfering with invitations-handler direct invocations
    const invitation = observable.get();
    await setup.peer.invitationsManager.cancelInvitation(invitation);
    return { ...invitation, swarmKey: PublicKey.random() };
  };
});
