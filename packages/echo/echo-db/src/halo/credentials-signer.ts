import { KeyChain, KeyRecord, Keyring, Signer } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";

/**
 * Contains a signer (keyring), provides signing keys to create signed credential messages.
 */
export class CredentialsSigner {
  constructor(
    private readonly _signer: Signer,
    private readonly _getIdentityKey: () => KeyRecord,
    private readonly _getDeviceKey: () => KeyRecord,
    private readonly _getDeviceSigningKeys: () => KeyRecord | KeyChain,
  ) {}

  get signer(): Signer {
    return this._signer;
  }

  getIdentityKey(): KeyRecord {
    return this._getIdentityKey();
  }

  getDeviceKey(): KeyRecord {
    return this._getDeviceKey();
  }

  /**
   * @returns Either a device key record or a key-chain for the device key.
   */
  getDeviceSigningKeys(): KeyRecord | KeyChain {
    return this._getDeviceSigningKeys();
  }
}