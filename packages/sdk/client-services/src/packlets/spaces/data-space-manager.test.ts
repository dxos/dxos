//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import path from 'node:path';

import { latch } from '@dxos/async';
import { SpecificCredential, createAdmissionCredentials } from '@dxos/credentials';
import { AuthStatus, DataServiceSubscriptions } from '@dxos/echo-pipeline';
import { testLocalDatabase } from '@dxos/echo-pipeline/testing';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { StorageType } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { createSigningContext, TestBuilder, syncItemsLocal } from '../testing';
import { DataSpaceManager } from './data-space-manager';

describe('DataSpaceManager', () => {
  test('create space', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    const identity = await createSigningContext(peer.keyring);
    const dataSpaceManager = new DataSpaceManager(
      peer.spaceManager,
      peer.metadataStore,
      new DataServiceSubscriptions(),
      peer.keyring,
      identity,
      peer.feedStore,
    );
    await dataSpaceManager.open();
    afterTest(() => dataSpaceManager.close());
    const space = await dataSpaceManager.createSpace();

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
    const identity1 = await createSigningContext(peer1.keyring);
    const dataSpaceManager1 = new DataSpaceManager(
      peer1.spaceManager,
      peer1.metadataStore,
      new DataServiceSubscriptions(),
      peer1.keyring,
      identity1,
      peer1.feedStore,
    );
    await dataSpaceManager1.open();
    afterTest(() => dataSpaceManager1.close());

    const peer2 = builder.createPeer();
    const identity2 = await createSigningContext(peer2.keyring);
    const dataSpaceManager2 = new DataSpaceManager(
      peer2.spaceManager,
      peer2.metadataStore,
      new DataServiceSubscriptions(),
      peer2.keyring,
      identity2,
      peer2.feedStore,
    );
    await dataSpaceManager2.open();
    afterTest(() => dataSpaceManager2.close());

    const space1 = await dataSpaceManager1.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        identity1.credentialSigner,
        identity2.identityKey,
        space1.key,
        space1.inner.genesisFeedKey,
      ),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await dataSpaceManager2.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });
    await dataSpaceManager2.waitUntilSpaceReady(space2.key);

    log('', {
      peer1: {
        identity: identity1.identityKey,
        device: identity1.deviceKey,
        control: space1.inner.controlFeedKey,
        data: space1.inner.dataFeedKey,
      },
      peer2: {
        identity: identity2.identityKey,
        device: identity2.deviceKey,
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

    await syncItemsLocal(space1.dataPipeline, space2.dataPipeline);

    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)).to.exist;
    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)).to.exist;
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
  });

  test('pub/sub API', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    const identity1 = await createSigningContext(peer1.keyring);
    const dataSpaceManager1 = new DataSpaceManager(
      peer1.spaceManager,
      peer1.metadataStore,
      new DataServiceSubscriptions(),
      peer1.keyring,
      identity1,
      peer1.feedStore,
    );
    await dataSpaceManager1.open();
    afterTest(() => dataSpaceManager1.close());

    const peer2 = builder.createPeer();
    const identity2 = await createSigningContext(peer2.keyring);
    const dataSpaceManager2 = new DataSpaceManager(
      peer2.spaceManager,
      peer2.metadataStore,
      new DataServiceSubscriptions(),
      peer2.keyring,
      identity2,
      peer2.feedStore,
    );
    await dataSpaceManager2.open();
    afterTest(() => dataSpaceManager2.close());

    const space1 = await dataSpaceManager1.createSpace();
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        identity1.credentialSigner,
        identity2.identityKey,
        space1.key,
        space1.inner.genesisFeedKey,
      ),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await dataSpaceManager2.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });

    // Coincidentally, this also waits until a P2P connection is established between peers.
    // TODO(dmaretskyi): Refine this to wait for connection specifically.
    await dataSpaceManager2.waitUntilSpaceReady(space2.key);

    const [receivedMessage, inc] = latch({ count: 1 });
    space2.listen('test', (message) => {
      expect(message.channelId).to.equal('test');
      inc();
    });

    await space1.postMessage('test', { '@type': 'google.protobuf.Any', test: true });
    await receivedMessage();
  });

  describe('Epochs', () => {
    test('Epoch truncates feeds', async () => {
      const builder = new TestBuilder();
      afterTest(async () => builder.destroy());

      const peer = builder.createPeer({
        storageType: typeof window === 'undefined' ? StorageType.NODE : StorageType.WEBFS,
      });
      const identity = await createSigningContext(peer.keyring);
      const dataSpaceManager = new DataSpaceManager(
        peer.spaceManager,
        peer.metadataStore,
        new DataServiceSubscriptions(),
        peer.keyring,
        identity,
        peer.feedStore,
      );
      await dataSpaceManager.open();
      afterTest(() => dataSpaceManager.close());
      const space = await dataSpaceManager.createSpace();
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

      const feedDataPath = path.join(space.inner.dataPipeline.pipelineState!.feeds[0].key.toHex(), 'data');
      const directory = peer.storage.createDirectory('feeds');
      const file = directory.getOrCreateFile(feedDataPath);
      afterTest(() => file.close());

      expect((await file.stat()).size === 0).to.be.true;

      for (const _ in range(10)) {
        await testLocalDatabase(space.dataPipeline);
      }

      expect((await file.stat()).size !== 0).to.be.true;
      await space.createEpoch();
      expect((await file.stat()).size === 0).to.be.true;
    }).onlyEnvironments('nodejs', 'chromium', 'firefox');

    test('Loads only last epoch', async () => {
      const builder = new TestBuilder();
      afterTest(async () => builder.destroy());

      const peer = builder.createPeer();
      const identity = await createSigningContext(peer.keyring);
      const epochsNumber = 10;
      const dataService = new DataServiceSubscriptions();
      let spaceKey: PublicKey;
      {
        // Create space and create epochs in it.s
        const dataSpaceManager = new DataSpaceManager(
          peer.spaceManager,
          peer.metadataStore,
          dataService,
          peer.keyring,
          identity,
          peer.feedStore,
        );
        await dataSpaceManager.open();
        afterTest(() => dataSpaceManager.close());

        const space = await dataSpaceManager.createSpace();
        spaceKey = space.key;
        await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

        for (const _ of range(epochsNumber)) {
          await testLocalDatabase(space.dataPipeline);
          await space.createEpoch();
        }
        await space.close();
        await dataSpaceManager.close();
      }
      {
        // Load same space and check if it loads only last epoch.s
        const dataSpaceManager = new DataSpaceManager(
          peer.spaceManager,
          peer.metadataStore,
          dataService,
          peer.keyring,
          identity,
          peer.feedStore,
        );
        await dataSpaceManager.open();
        afterTest(() => dataSpaceManager.close());

        const space = dataSpaceManager.spaces.get(spaceKey)!;

        const epochs: number[] = [];
        space.dataPipeline.onNewEpoch.on((epoch: SpecificCredential<Epoch>) => {
          epochs.push(epoch.subject.assertion.number);
        });
        const processedFirstEpoch = space.dataPipeline.onNewEpoch.waitFor(() => true);

        await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

        await processedFirstEpoch;
        expect(epochs).to.deep.equal([epochsNumber]);
      }
    });
  });
});
