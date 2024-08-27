//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { type Credential } from '@dxos/client/halo';
import { type PublicKey } from '@dxos/keys';

// TODO(burdon): Factor out to @dxos/hub-protocol.

export const matchServiceCredential =
  (capabilities: string[] = []) =>
  (credential: Credential) => {
    if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.ServiceAccess') {
      return false;
    }

    const { capabilities: credentialCapabilities } = credential.subject.assertion;
    return capabilities.every((capability) => credentialCapabilities.includes(capability));
  };

// TODO: reconcile with @dxos/hub-protocol

export const publicKeyToDid = (key: PublicKey): DID => {
  return `did:key:${key.toHex()}`;
};
