//
// Copyright 2019 DXOS.org
//

// dxos-testing-browser

import debug from 'debug';

import { expectToThrow } from '@dxos/async';

import { createIdentityInfoMessage } from '../identity/identity-message';
import { Filter, Keyring } from '../keys';
import { codecLoop, KeyType } from '../proto';
import { Party } from './party';
import {
  createEnvelopeMessage,
  createFeedAdmitMessage,
  createKeyAdmitMessage,
  createPartyGenesisMessage
} from './party-credential';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const log = debug('dxos:creds:party:test');

const createPartyKeyrings = async () => {
  // This Keyring has all the keypairs, so it is the initial source of things.
  const keyring = new Keyring();
  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await keyring.createKeyRecord({ type: KeyType[type] });
    }
  }

  const partyKey = keyring.findKey(Filter.matches({ type: KeyType.PARTY })).publicKey;

  return {
    partyKey,
    keyring
  };
};

test('Process basic message types', async () => {
  const { keyring } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  await keyring.createKeyRecord({ type: KeyType.FEED });
  await keyring.createKeyRecord({ type: KeyType.FEED });

  const [identityKeyA, identityKeyB] = keyring.findKeys(Keyring.signingFilter({ type: KeyType.IDENTITY }));
  const deviceKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  const partyKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.PARTY }));
  const [feedKeyA, feedKeyB, haloFeedKey] = keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }));

  // Create a KeyChain for the device to use similar to when using the HALO.
  let deviceKeyChain;
  {
    const haloMessages = new Map();
    const haloGenesis = createPartyGenesisMessage(keyring, identityKeyB, haloFeedKey, deviceKey);
    haloMessages.set(identityKeyB.publicKey.toHex(), haloGenesis);
    haloMessages.set(haloFeedKey.publicKey.toHex(), haloGenesis);
    haloMessages.set(deviceKey.publicKey.toHex(), haloGenesis);
    deviceKeyChain = Keyring.buildKeyChain(deviceKey.publicKey, haloMessages, [haloFeedKey.publicKey]);
  }

  const party = new Party(partyKey.publicKey);

  const messages = [
    // The Genesis message is signed by the party private key, the feed key, and one admitted key (IdentityA).
    createPartyGenesisMessage(keyring, partyKey, feedKeyA, identityKeyA),
    // Admit IdentityB using a KeyAdmit message.
    createKeyAdmitMessage(keyring, partyKey.publicKey, identityKeyB, [identityKeyA]),
    // Add another feed, and sign for it using the Device KeyChain associated with IdentityB.
    createFeedAdmitMessage(keyring, partyKey.publicKey, feedKeyB, [deviceKeyChain]),
    // Add an IdentityInfo, wrapped in an Envelope signed by the device KeyChain, as when copied from the HALO.
    createEnvelopeMessage(
      keyring,
      partyKey.publicKey,
      createIdentityInfoMessage(keyring, 'IdentityB', identityKeyB),
      [deviceKeyChain]
    )
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);
  expect(party.infoMessages.size).toEqual(0);
  expect(party.credentialMessages.size).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys).toContainEqual(identityKeyA.publicKey);
  expect(party.memberKeys).toContainEqual(identityKeyB.publicKey);
  expect(party.memberKeys).not.toContainEqual(deviceKey.publicKey);

  expect(party.memberFeeds).toContainEqual(feedKeyA.publicKey);
  expect(party.memberFeeds).toContainEqual(feedKeyB.publicKey);

  expect(party.credentialMessages.size).toBe(4);
  expect(party.credentialMessages.has(identityKeyA.publicKey.toHex())).toBe(true);
  expect(party.credentialMessages.has(identityKeyB.publicKey.toHex())).toBe(true);
  expect(party.credentialMessages.has(feedKeyA.publicKey.toHex())).toBe(true);
  expect(party.credentialMessages.has(deviceKey.publicKey.toHex())).toBe(false);

  expect(party.infoMessages.size).toBe(1);
  // We did not write and IdentityInfo message for IdentityA.
  expect(party.infoMessages.has(identityKeyA.publicKey.toHex())).toBe(false);
  expect(party.infoMessages.has(identityKeyB.publicKey.toHex())).toBe(true);

  const identityInfo = party.getInfo(identityKeyB.publicKey);
  expect(identityInfo.displayName).toEqual('IdentityB');
});

test('GreetingCommandPlugin envelopes', async () => {
  const { keyring: greeterKeyring, partyKey } = await createPartyKeyrings();
  const { keyring: inviteeKeyring } = await createPartyKeyrings();

  const party = new Party(partyKey);
  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  const genesis = codecLoop(
    createPartyGenesisMessage(greeterKeyring,
      greeterKeyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      greeterKeyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      greeterKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  );

  await party.processMessages([genesis]);

  expect(party.memberKeys).toContainEqual(greeterKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })).publicKey);

  // A self-signed admit message wrapped in a greeter-signed envelope.
  const pseudo = createKeyAdmitMessage(inviteeKeyring,
    partyKey,
    inviteeKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })),
    [inviteeKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))]);

  const envelope = codecLoop(
    createEnvelopeMessage(greeterKeyring,
      partyKey,
      pseudo,
      [greeterKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))]
    )
  );

  await party.processMessages([envelope]);
  expect(party.memberKeys).toContainEqual(inviteeKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })).publicKey);
});

test('Reject message from unknown source', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  const party = new Party(partyKey);
  const alienKey = await keyring.createKeyRecord();

  const messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))),
    createKeyAdmitMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })).publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })),
      [alienKey])
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys).toContainEqual(keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })).publicKey);
  expect(party.memberKeys).not.toContainEqual(keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })).publicKey);
  expect(party.memberKeys).not.toContainEqual(alienKey.publicKey);
});

test('Message signed by known and unknown key should not admit unknown key', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  const party = new Party(partyKey);
  const alienKey = await keyring.createKeyRecord();

  const messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))),
    createKeyAdmitMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })).publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })),
      [alienKey, keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))])
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys).toContainEqual(keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })).publicKey);
  expect(party.memberKeys).toContainEqual(keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })).publicKey);
  expect(party.memberKeys).not.toContainEqual(alienKey.publicKey);
});

test('Reject Genesis not signed by Party key', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  const party = new Party(partyKey);
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const wrongKey = await keyring.createKeyRecord();

  const messages = [
    createPartyGenesisMessage(keyring,
      wrongKey,
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);
});

test('Reject admit key message with wrong Party', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const party = new Party(partyKey);
  const wrongParty = await keyring.createKeyRecord();

  let messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);

  messages = [
    createKeyAdmitMessage(keyring,
      wrongParty.publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })),
      [keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))]
    )
  ].map(codecLoop);

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);
});

test('Reject admit feed message with wrong Party', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.FEED });
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const party = new Party(partyKey);
  const wrongParty = await keyring.createKeyRecord();

  let messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);

  messages = [
    createFeedAdmitMessage(keyring,
      wrongParty.publicKey,
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[1],
      [keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))]
    )
  ].map(codecLoop);

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);
});

test('Reject tampered Genesis message', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const party = new Party(partyKey);

  const messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  ].map(codecLoop);

  messages[0].payload.signed.nonce = Buffer.from('wrong');

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);
});

test('Reject tampered admit feed message', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.FEED });
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const party = new Party(partyKey);

  let messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
    )
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);

  messages = [
    createFeedAdmitMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })).publicKey,
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[1],
      [keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))]
    )
  ].map(codecLoop);

  messages[0].payload.signed.nonce = Buffer.from('wrong');

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);
});

test('Reject tampered admit key message', async () => {
  const { keyring, partyKey } = await createPartyKeyrings();
  await keyring.createKeyRecord({ type: KeyType.FEED });
  const party = new Party(partyKey);

  let messages = [
    createPartyGenesisMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })),
      keyring.findKeys(Keyring.signingFilter({ type: KeyType.FEED }))[0],
      keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })))
  ].map(codecLoop);

  expect(party.memberKeys.length).toEqual(0);
  expect(party.memberFeeds.length).toEqual(0);

  await party.processMessages(messages);

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);

  messages = [
    createKeyAdmitMessage(keyring,
      keyring.findKey(Filter.matches({ type: KeyType.PARTY })).publicKey,
      keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })),
      [keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))])
  ].map(codecLoop);

  messages[0].payload.signed.nonce = Buffer.from('wrong');

  await expectToThrow(() => party.processMessages(messages));

  expect(party.memberKeys.length).toEqual(1);
  expect(party.memberFeeds.length).toEqual(1);
});
