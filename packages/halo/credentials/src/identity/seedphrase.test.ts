//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { generateSeedPhrase, KeyPair, keyPairFromSeedPhrase } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';

import { Keyring } from '../keys';
import { KeyType } from '../proto';

it('Create cold identity key and recover', async () => {
  // Generate a seed phrase and validate result.
  const seedPhrase = generateSeedPhrase();
  expect(typeof seedPhrase === 'string').toBeTruthy();
  expect(seedPhrase.split(/\s+/g).length).toEqual(12);

  // Add the key to a keyring and verify it is retrievable.
  const identityKeyPair = keyPairFromSeedPhrase(seedPhrase);
  const origKeyring = new Keyring();
  await origKeyring.addKeyRecord({ ...identityKeyPair, type: KeyType.IDENTITY } as any);
  const identityKeyRecord = origKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
  expect(identityKeyRecord).toBeDefined();
  expect(identityKeyRecord!.type).toEqual(KeyType.IDENTITY);
  expect(identityKeyRecord!.own).toBeTruthy();

  // Recover seed phrase to key pair.
  const recoveredKeyPair: KeyPair = keyPairFromSeedPhrase(seedPhrase);

  // Verify same key as exported above.
  expect(PublicKey.from(recoveredKeyPair.publicKey)).toEqual(identityKeyRecord!.publicKey);
  const newKeyring = new Keyring();
  await newKeyring.addKeyRecord({ ...recoveredKeyPair, type: KeyType.IDENTITY } as any);

  /* Expect a message signed with the identity key in this new keyring to be verified as
   * being signed by the identity key in the original keyring.
   */
  const signed = newKeyring.sign({ message: 'Test' }, [
    newKeyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })) as any
  ]);

  // Note -- original keyring used to verify.
  // TODO(dboreham): Fix `Keyring.verify()` so it does a trusted verify -- someone broke this at some point.
  const verified = origKeyring.verify(signed);
  expect(verified).toBe(true);
});
