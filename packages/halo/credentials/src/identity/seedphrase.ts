//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';

import { createKeyPair } from '@dxos/crypto';

// Util functions for Identity: export, import, create.

/**
 * Generate bip39 seed phrase (aka mnemonic).
 */
export const generateSeedPhrase = (): string => generateMnemonic();

/**
 * Generate key pair from seed phrase.
 */
export const keyPairFromSeedPhrase = (seedPhrase: string) => {
  assert(seedPhrase);
  const seed = mnemonicToSeedSync(seedPhrase);
  return createKeyPair(seed);
};
