//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';
import { createAdmissionCredentials } from '@dxos/credentials';
import { DocumentModel } from '@dxos/document-model';
import { AuthStatus, DataServiceSubscriptions } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { test, describe } from '@dxos/test';

import { createSigningContext, HostTestBuilder, syncItemsLocal } from '../testing';
import { DataSpaceManager } from './data-space-manager';

describe('DataSpaceManager', () => {
  test('create space', async () => {
    const builder = new HostTestBuilder();

    const peer = builder.createPeer();
    const identity = await createSigningContext(peer.keyring);
    const dataSpaceManager = new DataSpaceManager(
      peer.spaceManager,
      peer.metadataStore,
      new DataServiceSubscriptions(),
      peer.keyring,
      identity,
      new ModelFactory().registerModel(DocumentModel),
      peer.feedStore,
      peer.snapshotStore
    );
    const space = await dataSpaceManager.createSpace();

    // Process all written mutations.
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.inner.spaceState.genesisCredential).to.exist;
    expect(space.inner.spaceState.members.size).to.equal(1);
    expect(space.inner.spaceState.feeds.size).to.equal(2);
    expect(space.inner.protocol.feeds.size).to.equal(2);
  });

  test('sync between peers', async () => {
    const builder = new HostTestBuilder();

    const peer1 = builder.createPeer();
    const identity1 = await createSigningContext(peer1.keyring);
    const dataSpaceManager1 = new DataSpaceManager(
      peer1.spaceManager,
      peer1.metadataStore,
      new DataServiceSubscriptions(),
      peer1.keyring,
      identity1,
      new ModelFactory().registerModel(DocumentModel),
      peer1.feedStore,
      peer1.snapshotStore
    );

    const peer2 = builder.createPeer();
    const identity2 = await createSigningContext(peer2.keyring);
    const dataSpaceManager2 = new DataSpaceManager(
      peer2.spaceManager,
      peer2.metadataStore,
      new DataServiceSubscriptions(),
      peer2.keyring,
      identity2,
      new ModelFactory().registerModel(DocumentModel),
      peer2.feedStore,
      peer1.snapshotStore
    );

    const space1 = await dataSpaceManager1.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        identity1.credentialSigner,
        identity2.identityKey,
        space1.key,
        space1.inner.genesisFeedKey
      )
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await dataSpaceManager2.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey
    });

    log('', {
      peer1: {
        identity: identity1.identityKey,
        device: identity1.deviceKey,
        control: space1.inner.controlFeedKey,
        data: space1.inner.dataFeedKey
      },
      peer2: {
        identity: identity2.identityKey,
        device: identity2.deviceKey,
        control: space2.inner.controlFeedKey,
        data: space2.inner.dataFeedKey
      }
    });

    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);
    await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    log('', {
      space1: {
        timeframe: space1.inner.controlPipeline.state.timeframe,
        endTimeframe: space1.inner.controlPipeline.state.endTimeframe
      },
      space2: {
        timeframe: space2.inner.controlPipeline.state.timeframe,
        endTimeframe: space2.inner.controlPipeline.state.endTimeframe
      }
    });
    log.break();

    await syncItemsLocal(space1.dataPipelineController, space2.dataPipelineController);

    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)).to.exist;
    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)).to.exist;
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
  });

  test('pub/sub API', async () => {
    const builder = new HostTestBuilder();

    const peer1 = builder.createPeer();
    const identity1 = await createSigningContext(peer1.keyring);
    const dataSpaceManager1 = new DataSpaceManager(
      peer1.spaceManager,
      peer1.metadataStore,
      new DataServiceSubscriptions(),
      peer1.keyring,
      identity1,
      new ModelFactory().registerModel(DocumentModel),
      peer1.feedStore,
      peer1.snapshotStore
    );

    const peer2 = builder.createPeer();
    const identity2 = await createSigningContext(peer2.keyring);
    const dataSpaceManager2 = new DataSpaceManager(
      peer2.spaceManager,
      peer2.metadataStore,
      new DataServiceSubscriptions(),
      peer2.keyring,
      identity2,
      new ModelFactory().registerModel(DocumentModel),
      peer2.feedStore,
      peer1.snapshotStore
    );

    const space1 = await dataSpaceManager1.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        identity1.credentialSigner,
        identity2.identityKey,
        space1.key,
        space1.inner.genesisFeedKey
      )
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await dataSpaceManager2.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey
    });

    const [receivedMessage, inc] = latch({ count: 1 });
    space2.listen('test', (message) => {
      expect(message.channelId).to.equal('test');
      inc();
    });

    await space1.postMessage('test', { '@type': 'google.protobuf.Any', test: true });
    await receivedMessage();
  });
});
