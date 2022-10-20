//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/**
 *
 */
export interface Signer {
  /**
   * Sign a message with the given key.
   * Key must be present in the keyring.
   */
  sign: (key: PublicKey, message: Uint8Array) => Promise<Uint8Array>
}
