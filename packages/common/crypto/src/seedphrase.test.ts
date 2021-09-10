//
// Copyright 2020 DXOS.org
//

import { createKeyPair } from '.';

import { generateSeedPhrase, keyPairFromSeedPhrase } from './seedphrase';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';

it('Basic bip39 operations work', async () => {
  const seedPhrase = generateMnemonic();
  const seed = mnemonicToSeedSync(seedPhrase)
  await createKeyPair(seed);
});

it('Create keypair from seedphrase', async () => {
  const seedPhrase = generateSeedPhrase();
  expect(typeof seedPhrase === 'string').toBeTruthy();
  expect(seedPhrase.split(/\s+/g).length).toEqual(12);

  const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
  expect(recoveredKeyPair).toBeDefined();
});
