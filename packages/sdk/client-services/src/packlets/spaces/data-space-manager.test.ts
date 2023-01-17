//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { createAdmissionCredentials } from '@dxos/credentials';
import { AuthStatus, DataServiceSubscriptions } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { test, describe } from '@dxos/test';

import { createSigningContext, syncItems, TestBuilder } from '../testing';
import { DataSpaceManager } from './data-space-manager';

describe('DataSpaceManager', () => {
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
      new ModelFactory().registerModel(ObjectModel),
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
      new ModelFactory().registerModel(ObjectModel),
      peer1.snapshotStore

    );

    const space1 = await dataSpaceManager1.createSpace();
    const space2 = await dataSpaceManager2.acceptSpace({
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
      controlFeedKey: await peer2.keyring.createKey(),
      dataFeedKey: await peer2.keyring.createKey()
    });

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials(
        identity1.credentialSigner,
        identity2.identityKey,
        identity2.deviceKey,
        space1.key,
        space2.inner.controlFeedKey,
        space2.inner.dataFeedKey,
        space2.inner.genesisFeedKey
      )
    );

    await syncItems(space1, space2);

    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)).to.exist;
    expect(space1.inner.protocol.sessions.get(identity2.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)).to.exist;
    expect(space2.inner.protocol.sessions.get(identity1.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
  });
});
