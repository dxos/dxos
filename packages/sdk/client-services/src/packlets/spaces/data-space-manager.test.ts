//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, latch } from '@dxos/async';
import { createAdmissionCredentials } from '@dxos/credentials';
import { AuthStatus } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { describe, openAndClose, test } from '@dxos/test';

import { TestBuilder } from '../testing';

describe('DataSpaceManager', () => {
  test('create space', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace();

    // Process all written mutations.
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.inner.spaceState.genesisCredential).to.exist;
    expect(space.inner.spaceState.members.size).to.equal(1);
    expect(space.inner.spaceState.feeds.size).to.equal(2);
    expect(space.inner.protocol.feeds.size).to.equal(2);
  });

  test('sync between peers', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    await peer1.createIdentity();

    const peer2 = builder.createPeer();
    await peer2.createIdentity();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);

    const space1 = await peer1.dataSpaceManager.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        peer1.identity.credentialSigner,
        peer2.identity.identityKey,
        space1.key,
        space1.inner.genesisFeedKey,
      ),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await peer2.dataSpaceManager.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    log('', {
      peer1: {
        identity: peer1.identity.identityKey,
        device: peer1.identity.deviceKey,
        control: space1.inner.controlFeedKey,
        data: space1.inner.dataFeedKey,
      },
      peer2: {
        identity: peer2.identity.identityKey,
        device: peer2.identity.deviceKey,
        control: space2.inner.controlFeedKey,
        data: space2.inner.dataFeedKey,
      },
    });

    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);
    await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    log('', {
      space1: {
        timeframe: space1.inner.controlPipeline.state.timeframe,
        endTimeframe: space1.inner.controlPipeline.state.endTimeframe,
      },
      space2: {
        timeframe: space2.inner.controlPipeline.state.timeframe,
        endTimeframe: space2.inner.controlPipeline.state.endTimeframe,
      },
    });
    log.break();

    expect(space1.inner.protocol.sessions.get(peer2.identity.deviceKey)).to.exist;
    expect(space1.inner.protocol.sessions.get(peer2.identity.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(space2.inner.protocol.sessions.get(peer1.identity.deviceKey)).to.exist;
    expect(space2.inner.protocol.sessions.get(peer1.identity.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
  });

  test('pub/sub API', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    await peer1.createIdentity();

    const peer2 = builder.createPeer();
    await peer2.createIdentity();
    await peer2.dataSpaceManager.open();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);

    const space1 = await peer1.dataSpaceManager.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        peer1.identity.credentialSigner,
        peer2.identity.identityKey,
        space1.key,
        space1.inner.genesisFeedKey,
      ),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await peer2.dataSpaceManager.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });

    // Coincidentally, this also waits until a P2P connection is established between peers.
    // TODO(dmaretskyi): Refine this to wait for connection specifically.
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    const [receivedMessage, inc] = latch({ count: 1 });
    space2.listen('test', (message) => {
      expect(message.channelId).to.equal('test');
      inc();
    });

    await space1.postMessage('test', { '@type': 'google.protobuf.Any', test: true });
    await receivedMessage();
  });

  describe('activation', () => {
    test('can activate and deactivate a space', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace();
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      expect(space.state).to.equal(SpaceState.READY);

      await space.deactivate();
      expect(space.state).to.equal(SpaceState.INACTIVE);

      await space.activate();
      await asyncTimeout(
        space.stateUpdate.waitForCondition(() => space.state === SpaceState.READY),
        500,
      );
    });
  });
});
