//
// Copyright 2020 DXOS.org
//

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';

import { createKeyPair } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { type KeyPair } from '@dxos/keys';

/**
 * Generate bip39 seed phrase (aka mnemonic).
 */
export const generateSeedPhrase = (): string => generateMnemonic();

/**
 * Generate key pair from seed phrase.
 */
export const keyPairFromSeedPhrase = (seedPhrase: string): KeyPair => {
  invariant(seedPhrase);
  const seed = mnemonicToSeedSync(seedPhrase);
  return createKeyPair(seed);
};
