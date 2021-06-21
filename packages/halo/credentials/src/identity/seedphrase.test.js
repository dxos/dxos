//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';

import { Keyring } from '../keys';
import { KeyType } from '../proto';
import { generateSeedPhrase, keyPairFromSeedPhrase } from './seedphrase';

test('Create keypair from seedphrase', async () => {
  const seedPhrase = generateSeedPhrase();
  expect(typeof seedPhrase === 'string').toBeTruthy();
  expect(seedPhrase.split(/\s+/g).length).toEqual(12);

  const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
  expect(recoveredKeyPair).toBeDefined();
})

test('Create cold identity key and recover', async () => {
  // Generate a seed phrase and validate result.
  /** @type {string} */
  const seedPhrase = generateSeedPhrase();
  expect(typeof seedPhrase === 'string').toBeTruthy();
  expect(seedPhrase.split(/\s+/g).length).toEqual(12);

  // Add the key to a keyring and verify it is retrievable.
  /** @type {KeyPair} */
  const identityKeyPair = keyPairFromSeedPhrase(seedPhrase);
  /** @type {Keyring} */
  const origKeyring = new Keyring();
  await origKeyring.addKeyRecord({ ...identityKeyPair, type: KeyType.IDENTITY });
  /** @type {KeyRecord} */
  const identityKeyRecord = origKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
  expect(identityKeyRecord).toBeDefined();
  expect(identityKeyRecord.type).toEqual(KeyType.IDENTITY);
  expect(identityKeyRecord.own).toBeTruthy();

  // Recover seed phrase to key pair.
  /** @type {KeyPair} */
  const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);

  // Verify same key as exported above.
  expect(PublicKey.from(recoveredKeyPair.publicKey)).toEqual(identityKeyRecord.publicKey);
  /** @type {Keyring} */
  const newKeyring = new Keyring();
  await newKeyring.addKeyRecord({ ...recoveredKeyPair, type: KeyType.IDENTITY });

  // Expect a message signed with the identity key in this new keyring to be verified as
  // being signed by the identity key in the original keyring.
  const signed = newKeyring.sign({ message: 'Test' }, [
    newKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))
  ]);

  // Note -- original keyring used to verify:
  // TODO(dboreham): fix Keyring.verify() so it does a trusted verify -- someone broke this at some point.
  const verified = origKeyring.verify(signed);
  expect(verified).toBe(true);
});
