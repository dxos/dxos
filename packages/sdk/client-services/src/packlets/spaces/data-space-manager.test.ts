//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import path from 'node:path';

import { asyncTimeout, latch } from '@dxos/async';
import { type SpecificCredential, createAdmissionCredentials } from '@dxos/credentials';
import { AuthStatus } from '@dxos/echo-pipeline';
import { testLocalDatabase } from '@dxos/echo-pipeline/testing';
import { writeMessages } from '@dxos/feed-store';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { StorageType } from '@dxos/random-access-storage';
import { afterTest, describe, openAndClose, test } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { TestBuilder, syncItemsLocal } from '../testing';

describe('DataSpaceManager', () => {
  test('create space', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.dataSpaceManager);

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

    await openAndClose(peer1.dataSpaceManager, peer2.dataSpaceManager);

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

    await syncItemsLocal(space1.dataPipeline, space2.dataPipeline);

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

    await openAndClose(peer1.dataSpaceManager, peer2.dataSpaceManager);

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

  describe('Epochs', () => {
    test
      .skip('Epoch truncates feeds', async () => {
        const builder = new TestBuilder();
        afterTest(async () => builder.destroy());

        const peer = builder.createPeer({
          dataStore: typeof window === 'undefined' ? StorageType.NODE : StorageType.WEBFS,
        });
        await peer.createIdentity();
        await openAndClose(peer.dataSpaceManager);
        const space = await peer.dataSpaceManager.createSpace();
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
      })
      .onlyEnvironments('nodejs', 'chromium', 'firefox')
      .tag('flaky');

    test('Loads only last epoch', async () => {
      const builder = new TestBuilder();
      afterTest(async () => builder.destroy());

      const peer = builder.createPeer();
      await peer.createIdentity();
      const epochsNumber = 10;
      let spaceKey: PublicKey;
      {
        // Create space and create epochs in it.s
        await openAndClose(peer.dataSpaceManager);

        const space = await peer.dataSpaceManager.createSpace();
        spaceKey = space.key;
        await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

        for (const _ of range(epochsNumber)) {
          await testLocalDatabase(space.dataPipeline);
          await space.createEpoch();
        }
        await space.close();
        await peer.dataSpaceManager.close();
        peer.props.dataSpaceManager = undefined;
      }
      {
        // Load same space and check if it loads only last epoch.s
        await openAndClose(peer.dataSpaceManager);

        const space = peer.dataSpaceManager.spaces.get(spaceKey)!;

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

    test('Items are cleared before epoch applied', async () => {
      const builder = new TestBuilder();
      afterTest(async () => builder.destroy());
      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.dataSpaceManager);

      // Create space and fill it with Items.
      const space = await peer.dataSpaceManager.createSpace();
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      const itemsNumber = 2;
      for (const _ of range(itemsNumber)) {
        await testLocalDatabase(space.dataPipeline);
      }

      // Create empty Epoch and check if it clears items.
      {
        const processedFirstEpoch = space.dataPipeline.onNewEpoch.waitFor(
          (epoch) => epoch.subject.assertion.number === 1,
        );

        // Empty snapshot.
        const snapshot: SpaceSnapshot = {
          spaceKey: space.key.asUint8Array(),
          timeframe: space.inner.dataPipeline.pipelineState!.timeframe,
          database: {},
        };

        const snapshotCid = await peer.snapshotStore.saveSnapshot(snapshot);

        const epoch: Epoch = {
          previousId: space.dataPipeline.currentEpoch?.id,
          timeframe: space.inner.dataPipeline.pipelineState!.timeframe,
          number: (space.dataPipeline.currentEpoch?.subject.assertion as Epoch).number + 1,
          snapshotCid,
        };

        const receipt = await space.inner.controlPipeline.writer.write({
          credential: {
            credential: await peer.props.signingContext!.credentialSigner.createCredential({
              subject: space.key,
              assertion: {
                '@type': 'dxos.halo.credentials.Epoch',
                ...epoch,
              },
            }),
          },
        });
        await space.inner.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
        await processedFirstEpoch;
      }

      expect(Array.from(space.dataPipeline.itemManager.entities.keys()).length).to.equal(0);
    });
  });

  describe('activation', () => {
    test('can activate and deactivate a space', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.dataSpaceManager);

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
      await testLocalDatabase(space.dataPipeline);
    });
  });
});
