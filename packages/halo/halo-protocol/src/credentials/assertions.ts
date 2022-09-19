//
// Copyright 2022 DXOS.org
//

import { MessageType, PublicKey } from '@dxos/protocols';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export const getCredentialAssertion = (credential: Credential): MessageType => credential.subject.assertion;

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey
): boolean => {
  const assertion = getCredentialAssertion(credential);
  return credential.subject.id.equals(deviceKey) &&
    credential.issuer.equals(identityKey) &&
    assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
    assertion.identityKey.equals(identityKey) &&
    assertion.deviceKey.equals(deviceKey);
};
