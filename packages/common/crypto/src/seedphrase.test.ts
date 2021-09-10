//
// Copyright 2020 DXOS.org
//

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import crypto from 'hypercore-crypto';
import { createKeyPair, generateSeedPhrase, keyPairFromSeedPhrase } from '.';

it('Basic bip39 operations work', async () => {
  const seedPhrase = generateMnemonic();
  const seed = mnemonicToSeedSync(seedPhrase);
  await createKeyPair(seed.slice(0, 32));
});

it('Create keypair from seedphrase', async () => {
  const seedPhrase = generateSeedPhrase();
  expect(typeof seedPhrase === 'string').toBeTruthy();
  expect(seedPhrase.split(/\s+/g).length).toEqual(12);

  const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
  expect(recoveredKeyPair).toBeDefined();
});
