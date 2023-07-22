//
// Copyright 2020 DXOS.org
//

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import invariant from 'tiny-invariant';

import { createKeyPair } from '@dxos/crypto';
import { KeyPair } from '@dxos/keys';

// Util functions for Identity: export, import, create.

/**
 * Generate bip39 seed phrase (aka mnemonic).
 *
 * @deprecated
 */
export const generateSeedPhrase = (): string => generateMnemonic();

/**
 * Generate key pair from seed phrase.
 *
 * @deprecated
 */
// TODO(dmaretskyi): Use web-crypto.
export const keyPairFromSeedPhrase = (seedPhrase: string): KeyPair => {
  invariant(seedPhrase);
  const seed = mnemonicToSeedSync(seedPhrase);
  return createKeyPair(seed);
};
