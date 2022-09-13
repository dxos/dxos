//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

export interface Signer {
  /**
   * Sign a message with the given key.
   * Key must be present in the keyring.
   */
  sign: (key: PublicKey, message: Uint8Array) => Promise<Uint8Array>

  /**
   * Verify a signature with the given key.
   * Key might not be present in the keyring.
   */
  verify: (key: PublicKey, message: Uint8Array, signature: Uint8Array) => Promise<boolean>
}
