//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { promiseTimeout } from '@dxos/async';
import {
  Keyring,
  KeyType,
} from '@dxos/credentials';
import { IHaloStream } from '@dxos/echo-protocol';

import { PartyProcessor } from '../pipeline';
import { createCredential } from '@dxos/halo-protocol';
import { AdmittedFeed, PartyMember } from '@dxos/halo-protocol';

const log = debug('dxos:echo:parties:party-processor:test');

describe('party-processor', () => {
  test('genesis', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: partyKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            partyKey: partyKey.publicKey
          },
          keyring
        })
      }
    });

    expect(partyProcessor.feedKeys).toHaveLength(0);
    expect(partyProcessor.memberKeys).toHaveLength(0);
    expect(partyProcessor.genesisRequired).toEqual(false)
  });

  test('member & feed admit', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);

    const feedAddedPromise = partyProcessor.feedAdded.waitForCount(1)
    const keyAddedPromise = partyProcessor.keyOrInfoAdded.waitForCount(1)

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: partyKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            partyKey: partyKey.publicKey
          },
          keyring
        })
      }
    });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: identityKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            partyKey: partyKey.publicKey,
            role: PartyMember.Role.ADMIN
          },
          keyring,
        })
      }
    });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: identityKey.publicKey,
          subject: feedKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: partyKey.publicKey,
            deviceKey: deviceKey.publicKey,
            identityKey: identityKey.publicKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
          keyring,
        })
      }
    });

    expect(partyProcessor.feedKeys).toHaveLength(1);
    expect(partyProcessor.memberKeys).toHaveLength(1);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);

    await feedAddedPromise;
    await keyAddedPromise;
  });

  test('feed admit with separate keyring', async () => {
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const partyProcessor = new PartyProcessor(partyKey.publicKey);
    expect(partyProcessor.partyKey).toBeTruthy();

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: partyKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            partyKey: partyKey.publicKey
          },
          keyring
        })
      }
    });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: identityKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            partyKey: partyKey.publicKey,
            role: PartyMember.Role.ADMIN
          },
          keyring,
        })
      }
    });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: identityKey.publicKey,
          subject: feedKey.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: partyKey.publicKey,
            deviceKey: deviceKey.publicKey,
            identityKey: identityKey.publicKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
          keyring,
        })
      }
    });

    const keyring2 = new Keyring();
    const identityKey2 = await keyring2.createKeyRecord({ type: KeyType.IDENTITY });
    const feedKey2 = await keyring2.createKeyRecord({ type: KeyType.FEED });
    const deviceKey2 = await keyring2.createKeyRecord({ type: KeyType.DEVICE });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: partyKey.publicKey,
          subject: identityKey2.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            partyKey: partyKey.publicKey,
            role: PartyMember.Role.ADMIN
          },
          keyring,
        })
      }
    });

    await partyProcessor.processMessage({
      meta: {
        feedKey: feedKey.publicKey,
        seq: 0
      },
      data: {
        credential: await createCredential({
          issuer: identityKey2.publicKey,
          subject: feedKey2.publicKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: partyKey.publicKey,
            deviceKey: deviceKey2.publicKey,
            identityKey: identityKey2.publicKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
          keyring: keyring2,
        })
      }
    });

    expect(partyProcessor.feedKeys).toHaveLength(2);
    expect(partyProcessor.memberKeys).toHaveLength(2);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey.publicKey);
    expect(partyProcessor.feedKeys).toContainEqual(feedKey2.publicKey);
    expect(partyProcessor.memberKeys).toContainEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningMember(feedKey.publicKey)).toEqual(identityKey.publicKey);
    expect(partyProcessor.getFeedOwningMember(feedKey2.publicKey)).toEqual(identityKey2.publicKey);

    log(partyProcessor.feedKeys);
  });

  test.skip('identity info message sets display name & fires a keyOrInfoAdded event', async () => {
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
