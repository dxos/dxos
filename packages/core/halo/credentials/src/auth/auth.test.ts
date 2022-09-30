//
// Copyright 2019 DXOS.org
//

// DXOS testing browser.

import expect from 'expect';
import moment from 'moment';

import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { Message, SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { Filter, Keyring } from '../keys';
import {
  admitsKeys,
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage,
  PartyState
} from '../party';
import { codecLoop } from '../proto';
import { createAuthMessage } from './auth-message';
import { PartyAuthenticator } from './authenticator';

const createPartyKeyrings = async () => {
  // This Keyring has the full key pairs, which is the case when creating a new Party.
  const keyring = new Keyring();
  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await keyring.createKeyRecord({ type: KeyType[type as any] });
    }
  }

  const partyKey = keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!.publicKey;

  /* This Keyring will have nothing but the public key of the Party. This mimics the initial state
   * when joining a Party, since all that is known at that time know at that time is the public key.
   */
  const bareKeyring = new Keyring();
  await bareKeyring.addPublicKey({
    publicKey: partyKey,
    type: KeyType.PARTY,
    trusted: true,
    own: false
  });

  return {
    partyKey,
    keyring,
    bareKeyring
  };
};

/* eslint-enable @typescript-eslint/no-unused-vars */
const messageMap = (messages: (Message | SignedMessage)[]): Map<string, Message | SignedMessage> => {
  const map = new Map();
  for (const message of messages) {
    const admits = admitsKeys(message);
    for (const key of admits) {
      map.set(key.toHex(), message);
    }
  }
  return map;
};

const getIdentityKeyChainForDevice = (keyring: Keyring, devicePublicKey: PublicKey, messages: Map<string, Message | SignedMessage>) => Keyring.buildKeyChain(devicePublicKey, messages,
  keyring.findKeys(Filter.matches({ type: KeyType.FEED })).map(key => key.publicKey));

describe('PartyAuthenticator', () => {
  it('Chain of Keys', async () => {
    const haloKeyring = new Keyring();
    const identityKey = await haloKeyring.createKeyRecord({ type: KeyType.PARTY });
    const deviceKeyA = await haloKeyring.createKeyRecord({ type: KeyType.DEVICE });
    const deviceKeyB = await haloKeyring.createKeyRecord({ type: KeyType.DEVICE });
    const deviceKeyC = await haloKeyring.createKeyRecord({ type: KeyType.DEVICE });
    const feedKeyA = await haloKeyring.createKeyRecord({ type: KeyType.FEED });

    const messages = new Map();

    // The first message in the chain in always a PartyGenesis for the Halo.
    messages.set(identityKey.publicKey.toHex(), createPartyGenesisMessage(haloKeyring, identityKey, feedKeyA.publicKey, deviceKeyA));
    messages.set(deviceKeyA.publicKey.toHex(), messages.get(identityKey.publicKey.toHex()));
    messages.set(feedKeyA.publicKey.toHex(), messages.get(identityKey.publicKey.toHex()));

    // Next is DeviceB greeted by DeviceA.
    messages.set(deviceKeyB.publicKey.toHex(),
      createEnvelopeMessage(haloKeyring, identityKey.publicKey,
        createKeyAdmitMessage(haloKeyring, identityKey.publicKey, deviceKeyB, [deviceKeyB]),
        [deviceKeyA]
      ));

    // Next is DeviceC greeted by DeviceB.
    messages.set(deviceKeyC.publicKey.toHex(),
      createEnvelopeMessage(haloKeyring, identityKey.publicKey,
        createKeyAdmitMessage(haloKeyring, identityKey.publicKey, deviceKeyC, [deviceKeyC]),
        [deviceKeyB]
      ));

    const targetKeyring = new Keyring();
    await targetKeyring.addPublicKey({
      publicKey: identityKey.publicKey,
      type: KeyType.IDENTITY,
      trusted: true,
      own: false
    });

    for (const deviceKey of [deviceKeyA, deviceKeyB, deviceKeyC]) {
      const emptyKeyring = new Keyring();
      const chain = Keyring.buildKeyChain(deviceKey.publicKey, messages);
      // In the target keyring, which only has the Identity, it should chase all the way back to the Identity.
      expect(identityKey.publicKey).toEqual((await targetKeyring.findTrusted(chain))!.publicKey);
      // And in the halo, which has all the keys, it should chase straight back to this key.
      expect(deviceKey.publicKey).toEqual((await haloKeyring.findTrusted(chain))!.publicKey);
      // And in an empty Keyring, we should not get anything.
      expect(await emptyKeyring.findTrusted(chain)).toBeUndefined();
    }
  });

  it('good direct', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});

    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    // Only add the Identity to the party keyring.
    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(keyring, partyKey, identityKeyRecord!, identityKeyRecord!)
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(true);
  });

  it('auth callback is called', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);

    let called = false;
    const auth = new PartyAuthenticator(party, async (msg) => {
      called = true;
    });

    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!;

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    // Only add the Identity to the party keyring.
    await party.processMessages(messages);

    const newFeedKeyRecord = await keyring.createKeyRecord({ type: KeyType.FEED })!;
    const feedAdmit = createFeedAdmitMessage(
      keyring,
      partyKey,
      newFeedKeyRecord.publicKey
    );

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
        identityKeyRecord,
        identityKeyRecord,
        newFeedKeyRecord.publicKey,
        undefined,
        feedAdmit
      )
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(true);

    expect(called).toEqual(true);
  });

  it('good chain', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});

    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    const secondDeviceKeyRecord = await keyring.createKeyRecord({ type: KeyType.DEVICE });

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    // Only add the Identity to the party keyring.
    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
      identityKeyRecord!,
      getIdentityKeyChainForDevice(
        keyring,
        secondDeviceKeyRecord.publicKey,
        messageMap([
          ...messages,
          createKeyAdmitMessage(keyring, partyKey, deviceKeyRecord!, [identityKeyRecord!]),
          createKeyAdmitMessage(keyring, partyKey, secondDeviceKeyRecord, [deviceKeyRecord!])
        ]
        )
      )
      )
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(true);
  });

  it('bad chain', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});

    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    const secondDeviceKeyRecord = await keyring.createKeyRecord({ type: KeyType.DEVICE });

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    // Only add the Identity to the party keyring.
    await party.processMessages(messages);

    // A bad chain, it doesn't track back to the Identity.
    const chain = getIdentityKeyChainForDevice(
      keyring,
      secondDeviceKeyRecord.publicKey,
      messageMap([
        ...messages,
        createKeyAdmitMessage(keyring, partyKey, deviceKeyRecord!, [deviceKeyRecord!]),
        createKeyAdmitMessage(keyring, partyKey, secondDeviceKeyRecord, [deviceKeyRecord!])
      ]
      )
    );

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
      identityKeyRecord!,
      chain
      )
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  // TODO(dboreham): This test isn't discriminating errors because when I broke the code entirely it still passed.
  it('wrong key', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const wrongKey = await keyring.createKeyRecord();

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!
      )
    ];
    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!,
      wrongKey
      )
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  it('wrong party', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];
    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        randomBytes(32),
      identityKeyRecord!,
      identityKeyRecord!
      )
    );

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  it('missing deviceKey', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});

    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!
      )
    ];
    await party.processMessages(messages);

    const wrappedCredentials = {
      '@type': 'dxos.halo.signed.Message',
      payload:
      keyring.sign({
        '@type': 'dxos.halo.credentials.auth.Auth',
        partyKey,
        identityKey: identityKeyRecord!.publicKey
      }, [identityKeyRecord!])
    };

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  it('tampered message', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
      identityKeyRecord!,
      identityKeyRecord!
      )
    );

    const before = await auth.authenticate(wrappedCredentials.payload);
    expect(before).toBe(true);

    wrappedCredentials.payload.signed.payload.deviceKey = randomBytes(32);

    const after = await auth.authenticate(wrappedCredentials.payload);
    expect(after).toBe(false);
  });

  it('tampered signature', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    await party.processMessages(messages);

    const wrappedCredentials = codecLoop(
      createAuthMessage(
        keyring,
        partyKey,
      identityKeyRecord!,
      identityKeyRecord!
      )
    );

    const before = await auth.authenticate(wrappedCredentials.payload);
    expect(before).toBe(true);

    wrappedCredentials.payload.signatures[0].signature = randomBytes(64);

    const after = await auth.authenticate(wrappedCredentials.payload);
    expect(after).toBe(false);
  });

  it('signature too old', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    await party.processMessages(messages);

    const wrappedCredentials = {
      '@type': 'dxos.halo.signed.Message',
      payload:
      keyring.sign({
        '@type': 'dxos.halo.credentials.auth.Auth',
        partyKey,
        identityKey: identityKeyRecord!.publicKey,
        deviceKey: deviceKeyRecord!.publicKey
      },
      [identityKeyRecord!],
      undefined,
      moment().subtract(2, 'days').format('YYYY-MM-DDTHH:mm:ssZ')
      )
    };

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  it('signature too far in future', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    await party.processMessages(messages);

    const wrappedCredentials = {
      '@type': 'dxos.halo.signed.Message',
      payload:
      keyring.sign({
        '@type': 'dxos.halo.credentials.auth.Auth',
        partyKey,
        identityKey: identityKeyRecord!.publicKey,
        deviceKey: deviceKeyRecord!.publicKey
      },
      [identityKeyRecord!],
      undefined,
      moment().add(2, 'days').format('YYYY-MM-DDTHH:mm:ssZ')
      )
    };

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

  it('signature date invalid', async () => {
    const { keyring, partyKey } = await createPartyKeyrings();
    const party = new PartyState(partyKey);
    const auth = new PartyAuthenticator(party, async () => {});
    const identityKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    const deviceKeyRecord = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));

    const messages = [
      createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY }))!,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.FEED }))!.publicKey,
      identityKeyRecord!
      )
    ];

    await party.processMessages(messages);

    const wrappedCredentials = {
      '@type': 'dxos.halo.signed.Message',
      payload:
      keyring.sign({
        '@type': 'dxos.halo.credentials.auth.Auth',
        partyKey,
        identityKey: identityKeyRecord!.publicKey,
        deviceKey: deviceKeyRecord!.publicKey
      },
      [identityKeyRecord!],
      undefined,
      'INVALID'
      )
    };

    const ok = await auth.authenticate(wrappedCredentials.payload);
    expect(ok).toBe(false);
  });

});
