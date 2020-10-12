//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import {
  Keyring, KeyType, createPartyGenesisMessage, createFeedAdmitMessage, createKeyAdmitMessage, createEnvelopeMessage
} from '@dxos/credentials';
import { IHaloStream } from '@dxos/echo-protocol';

import { PartyProcessor } from './party-processor';

const log = debug('dxos:echo:party-processor:test');

describe('party-processor', () => {
  test('genesis', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    const genesisMessage = createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey);

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
      data: createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey)
    };
    await partyProcessor.processMessage(genesisMessage);

    const feedKey2 = await keyring.createKeyRecord({ type: KeyType.FEED });
    const feedAdmit: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring, partyKey.publicKey, feedKey2, identityKey)
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
      data: createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey)
    };
    await partyProcessor.processMessage(genesisMessage);
    const feedAdmit: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring, partyKey.publicKey, feedKey, identityKey)
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
        [identityKey], null
      )
    };
    await partyProcessor.processMessage(keyAdmit);

    const feedAdmit2: IHaloStream = {
      meta: {
        feedKey: feedKey.publicKey,
        seq: 1
        // TODO(telackey): Should ownership data go here?
      },
      data: createFeedAdmitMessage(keyring2, partyKey.publicKey, feedKey2, identityKey2)
    };
    await partyProcessor.processMessage(feedAdmit2);

    expect(partyProcessor.feedKeys).toHaveLength(2);
    expect(partyProcessor.memberKeys).toHaveLength(2);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey2.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningIdentity(feedKey.publicKey)).toEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningIdentity(feedKey2.publicKey)).toEqual(identityKey2.publicKey);

    log(partyProcessor.feedKeys);
  });
});
