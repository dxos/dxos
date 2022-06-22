//
// Copyright 2022 DXOS.org
//

import { createIdentityInfoMessage, createKeyAdmitMessage, createPartyGenesisMessage, KeyChain, KeyRecord, Keyring, KeyType, SignedMessage } from '@dxos/credentials';

import { ContactManager, Preferences } from '../halo';
import { CredentialsSigner } from './credentials-signer';

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
  displayName: string | undefined
  createCredentialsSigner(): CredentialsSigner
  preferences: Preferences | undefined
  contacts: ContactManager | undefined
}

export type IdentityCredentialsProvider = () => IdentityCredentials | undefined

export async function createTestIdentityCredentials (keyring: Keyring): Promise<IdentityCredentials> {
  const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });
  const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

  const partyGenesis = createPartyGenesisMessage(keyring, identityKey, feedKey.publicKey, deviceKey);
  const keyAdmit = createKeyAdmitMessage(keyring, identityKey.publicKey, identityKey);

  const messageMap = new Map();
  messageMap.set(deviceKey.publicKey.toHex(), partyGenesis);
  messageMap.set(identityKey.publicKey.toHex(), keyAdmit);
  const deviceKeyChain = Keyring.buildKeyChain(deviceKey.publicKey, messageMap, [feedKey.publicKey]);

  const displayName = identityKey.publicKey.humanize();
  const identityInfo = createIdentityInfoMessage(keyring, displayName, identityKey);

  return {
    keyring,
    identityKey,
    deviceKey,
    deviceKeyChain,
    identityGenesis: keyAdmit.payload as SignedMessage,
    identityInfo: identityInfo.payload as SignedMessage,
    displayName,
    createCredentialsSigner: () => new CredentialsSigner(keyring, identityKey, deviceKey, deviceKeyChain),
    preferences: undefined,
    contacts: undefined
  };
}
