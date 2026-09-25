//
// Copyright 2020 DXOS.org
//

import { createKeyPair } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { type KeyPair } from '@dxos/keys';

/**
 * bip39 carries the full wordlist set (~185 KB) and is only reachable while creating or recovering
 * an identity, so it loads on demand rather than riding this barrel into every boot graph.
 */
const loadBip39 = () => import('bip39');

/**
 * Generate bip39 seed phrase (aka mnemonic).
 */
export const generateSeedPhrase = async (): Promise<string> => {
  const { generateMnemonic } = await loadBip39();
  return generateMnemonic();
};

/**
 * Generate key pair from seed phrase.
 */
export const keyPairFromSeedPhrase = async (seedPhrase: string): Promise<KeyPair> => {
  invariant(seedPhrase);
  const { mnemonicToSeedSync } = await loadBip39();
  const seed = mnemonicToSeedSync(seedPhrase);
  return createKeyPair(seed);
};
