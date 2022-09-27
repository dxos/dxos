//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { promiseTimeout } from '@dxos/async';
import {
  Keyring,
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createIdentityInfoMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage
} from '@dxos/credentials';
import { IHaloStream } from '@dxos/echo-protocol';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

import { PartyProcessor } from '../pipeline';

const log = debug('dxos:echo:parties:party-processor:test');

describe('party-processor', () => {
  test('genesis', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    const genesisMessage = createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey);

    const message: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: genesisMessage
    };

    expect(partyProcessor.feedKeys).toHaveLength(0);
    expect(partyProcessor.memberKeys).toHaveLength(0);

    await partyProcessor.processMessage(message);

    expect(partyProcessor.feedKeys).toHaveLength(1);
    expect(partyProcessor.memberKeys).toHaveLength(1);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);

    log(partyProcessor.feedKeys);
  });

  test('feed admit', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    const genesisMessage: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey)
    };
    await partyProcessor.processMessage(genesisMessage);

    const feedKey2 = await keyring.createKeyRecord({ type: KeyType.FEED });
    const feedAdmit: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring, partyKey.publicKey, feedKey2.publicKey, [identityKey])
    };
    await partyProcessor.processMessage(feedAdmit);

    expect(partyProcessor.feedKeys).toHaveLength(2);
    expect(partyProcessor.memberKeys).toHaveLength(1);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey2.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);

    log(partyProcessor.feedKeys);
  });

  test('feed admit with separate keyring', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    const genesisMessage: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey)
    };
    await partyProcessor.processMessage(genesisMessage);
    const feedAdmit: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring, partyKey.publicKey, feedKey.publicKey, [identityKey])
    };
    await partyProcessor.processMessage(feedAdmit);

    const keyring2 = new Keyring();
    const identityKey2 = await keyring2.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey2 = await keyring2.createKeyRecord({ type: KeyType.FEED });

    const keyAdmit: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 1
      },
      data: createEnvelopeMessage(keyring, partyKey.publicKey,
        createKeyAdmitMessage(keyring2, partyKey.publicKey, identityKey2),
        [identityKey]
      )
    };
    await partyProcessor.processMessage(keyAdmit);

    const feedAdmit2: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 1
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring2, partyKey.publicKey, feedKey2.publicKey, [identityKey2])
    };
    await partyProcessor.processMessage(feedAdmit2);

    expect(partyProcessor.feedKeys).toHaveLength(2);
    expect(partyProcessor.memberKeys).toHaveLength(2);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey2.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningMember(feedKey.publicKey)).toEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningMember(feedKey2.publicKey)).toEqual(identityKey2.publicKey);

    log(partyProcessor.feedKeys);
  });

  test('identity info message sets display name & fires a keyOrInfoAdded event', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const identityKey2 = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    const meta = (seq: number) => ({ feedKey: feedKey.publicKey, seq });

    await partyProcessor.processMessage({
      meta: meta(0),
      data: createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey)
    });

    const firedOnce = partyProcessor.keyOrInfoAdded.waitForCount(1);
    const firedTwice = partyProcessor.keyOrInfoAdded.waitForCount(2);

    await partyProcessor.processMessage({
      meta: meta(1),
      data: createKeyAdmitMessage(keyring, partyKey.publicKey, identityKey2, [identityKey])
    });

    await promiseTimeout(firedOnce, 100, new Error('Expected event to be fired.'));

    await partyProcessor.processMessage({
      meta: meta(2),
      data: createEnvelopeMessage(
        keyring,
        partyKey.publicKey,
        createIdentityInfoMessage(keyring, 'Test user', identityKey2),
        [identityKey2]
      )
    });

    await promiseTimeout(firedTwice, 100, new Error('Expected event to be fired.'));

    expect(partyProcessor.getMemberInfo(identityKey2.publicKey)?.displayName).toEqual('Test user');
  });
});
