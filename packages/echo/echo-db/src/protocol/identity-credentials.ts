import { KeyChain, KeyRecord, Keyring, SignedMessage } from "@dxos/credentials";
import { ContactManager, Preferences } from "../halo";
import { CredentialsSigner } from "./credentials-signer";

/**
 * Provides access to identity credentials without revealing the underlying mechanism (HALO party).
 */
export interface IdentityCredentials {
  keyring: Keyring
  identityKey: KeyRecord
  deviceKey: KeyRecord
  deviceKeyChain: KeyChain
  identityGenesis: SignedMessage
  identityInfo: SignedMessage | undefined
  createCredentialsSigner(): CredentialsSigner
  preferences: Preferences | undefined
  contacts: ContactManager | undefined
}

export type IdentityCredentialsProvider = () => IdentityCredentials | undefined