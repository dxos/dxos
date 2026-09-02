//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { type PushStream, Trigger, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey, SpaceId } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type AdmissionResponse, type IntroductionRequest } from '@dxos/protocols/proto/dxos/halo/invitations';
import { openAndClose } from '@dxos/test-utils';
import { type MetricData, TRACE_PROCESSOR } from '@dxos/tracing';

import { TestBuilder } from '../testing';
import { type EdgeInvitationClient } from './edge-invitation-handler';
import { type InvitationProtocol } from './invitation-protocol';
import { InvitationsHandler } from './invitations-handler';
import { SpaceInvitationProtocol } from './space-invitation-protocol';

type Sample = { name: string; tags: Record<string, unknown> };

/**
 * Collects counter samples emitted through the global trace processor for the duration of a test.
 */
const collectSamples = (): Sample[] => {
  const samples: Sample[] = [];
  const processor = {
    increment: (name: string, _value?: number, data?: MetricData) => {
      samples.push({ name, tags: { ...data?.tags } });
    },
    distribution: () => {},
    set: () => {},
    gauge: () => {},
    observe: () => () => {},
  };
  TRACE_PROCESSOR.remoteMetrics.registerProcessor(processor);
  onTestFinished(() => TRACE_PROCESSOR.remoteMetrics.unregisterProcessor(processor));
  return samples;
};

const countOf = (samples: Sample[], name: string, tags: Record<string, unknown>): number =>
  samples.filter(
    (sample) => sample.name === name && Object.entries(tags).every(([key, value]) => sample.tags[key] === value),
  ).length;

const createStateSink = (): PushStream<Invitation> & { waitFor(state: Invitation.State): Promise<void> } => {
  const states: Invitation.State[] = [];
  return {
    next: (invitation: Invitation) => states.push(invitation.state),
    error: () => {},
    complete: () => {},
    waitFor: (state: Invitation.State) => waitForCondition({ condition: () => states.includes(state) }),
  } as unknown as PushStream<Invitation> & { waitFor(state: Invitation.State): Promise<void> };
};

describe('invitation metrics', { timeout: 60_000 }, () => {
  let testBuilder: TestBuilder;

  beforeEach(() => {
    testBuilder = new TestBuilder();
  });

  test('host and guest each record success over the swarm', async () => {
    const samples = collectSamples();

    const hostPeer = testBuilder.createPeer();
    await hostPeer.createIdentity();
    await openAndClose(hostPeer.echoHost, hostPeer.dataSpaceManager);
    await hostPeer.echoHost.addReplicator(Context.default(), hostPeer.meshEchoReplicator);
    const space = await hostPeer.dataSpaceManager.createSpace(new Context());

    const guestPeer = testBuilder.createPeer();
    await guestPeer.createIdentity();
    await openAndClose(guestPeer.echoHost, guestPeer.dataSpaceManager);
    await guestPeer.echoHost.addReplicator(Context.default(), guestPeer.meshEchoReplicator);

    const observable = await hostPeer.invitationsManager.createInvitation(new Context(), {
      type: Invitation.Type.DELEGATED,
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.SHARED_SECRET,
      spaceKey: space.key,
      multiUse: false,
    });
    await hostPeer.invitationsManager.cancelInvitation(observable.get());
    const invitation: Invitation = { ...observable.get(), swarmKey: PublicKey.random() };

    const hostCtx = new Context();
    const guestCtx = new Context();
    onTestFinished(async () => {
      await hostCtx.dispose();
      await guestCtx.dispose();
    });

    const hostHandler = new InvitationsHandler(hostPeer.networkManager, undefined, {
      teleport: { controlHeartbeatInterval: 250 },
    });
    const hostSink = createStateSink();
    hostHandler.handleInvitationFlow(
      hostCtx,
      hostSink,
      new SpaceInvitationProtocol(hostPeer.dataSpaceManager, hostPeer.identity, hostPeer.keyring, space.key),
      invitation,
    );

    const guestHandler = new InvitationsHandler(guestPeer.networkManager, undefined, {
      teleport: { controlHeartbeatInterval: 250 },
    });
    const guestSink = createStateSink();
    const authCode = new Trigger<string>();
    guestHandler.acceptInvitation(
      guestCtx,
      guestSink,
      new SpaceInvitationProtocol(guestPeer.dataSpaceManager, guestPeer.identity, guestPeer.keyring, space.key),
      invitation,
      authCode,
    );

    await guestSink.waitFor(Invitation.State.READY_FOR_AUTHENTICATION);
    authCode.wake(invitation.authCode!);
    await guestSink.waitFor(Invitation.State.SUCCESS);
    await hostSink.waitFor(Invitation.State.SUCCESS);

    // The invitation is minted through the manager, which hosts (and then cancels) a first flow of its own.
    expect(countOf(samples, 'dxos.invitation.host', { role: 'host', method: 'swarm' })).to.be.greaterThan(0);
    expect(countOf(samples, 'dxos.invitation.success', { role: 'host', method: 'swarm' })).to.equal(1);
    expect(countOf(samples, 'dxos.invitation.success', { role: 'guest', method: 'swarm' })).to.equal(1);
  });

  test('guest records success when admitted by EDGE', async () => {
    const samples = collectSamples();

    const admissionRequest = {
      identityKey: PublicKey.random(),
      deviceKey: PublicKey.random(),
      controlFeedKey: PublicKey.random(),
      dataFeedKey: PublicKey.random(),
    };
    const accepted = new Trigger<AdmissionResponse>();
    const protocol: InvitationProtocol = {
      toJSON: () => ({}),
      checkCanInviteNewMembers: () => undefined,
      getInvitationContext: () => ({ kind: Invitation.Kind.SPACE }),
      delegate: async () => PublicKey.random(),
      cancelDelegation: async () => {},
      admit: async () => {
        throw new Error('not a host');
      },
      checkInvitation: () => undefined,
      createIntroduction: (): IntroductionRequest => ({}),
      createAdmissionRequest: async () => ({ space: admissionRequest }),
      accept: async (_ctx, response) => {
        accepted.wake(response);
        return {};
      },
    };

    // Empty credential bytes: the flow only forwards the decoded credential to `protocol.accept`.
    const edgeClient: EdgeInvitationClient = {
      joinSpaceByInvitation: async () => ({
        spaceMemberCredential: '',
        spaceGenesisFeedKey: PublicKey.random().toHex(),
      }),
    };

    const peer = testBuilder.createPeer();
    const handler = new InvitationsHandler(peer.networkManager, edgeClient);
    const ctx = new Context();
    onTestFinished(async () => {
      await ctx.dispose();
    });

    handler.acceptInvitation(
      ctx,
      createStateSink(),
      protocol,
      {
        type: Invitation.Type.DELEGATED,
        kind: Invitation.Kind.SPACE,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        invitationId: PublicKey.random().toHex(),
        spaceId: SpaceId.random(),
        swarmKey: PublicKey.random(),
        state: Invitation.State.INIT,
        multiUse: false,
      },
      new Trigger<string>(),
    );

    await accepted.wait();
    expect(countOf(samples, 'dxos.invitation.success', { role: 'guest', method: 'edge' })).to.equal(1);
    expect(countOf(samples, 'dxos.invitation.success', { role: 'host', method: 'swarm' })).to.equal(0);
  });
});
