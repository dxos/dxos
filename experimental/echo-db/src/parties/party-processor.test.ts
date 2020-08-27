//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Keyring, KeyType, createPartyGenesisMessage } from '@dxos/credentials';
import { IHaloStream } from '@dxos/experimental-echo-protocol';

import { HaloPartyProcessor } from './halo-party-processor';
import { TestPartyProcessor } from './test-party-processor';

const log = debug('dxos:echo:party-processor:test');
debug.enable('dxos:echo:*');

describe('party-processor', () => {
  test('genesis - halo', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new HaloPartyProcessor(partyKey.publicKey);
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
  test('genesis - test', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new TestPartyProcessor(partyKey.publicKey, feedKey.publicKey);
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

    expect(partyProcessor.feedKeys).toHaveLength(1);
    expect(partyProcessor.memberKeys).toHaveLength(0);

    await partyProcessor.processMessage(message);

    expect(partyProcessor.feedKeys).toHaveLength(1);
    expect(partyProcessor.memberKeys).toHaveLength(1);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);

    log(partyProcessor.feedKeys);
  });
});
