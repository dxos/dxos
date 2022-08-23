//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Credential } from '../proto/gen/dxos/halo/credentials';
import { getCredentialAssertion } from './types';

export const isValidAuthorizedDeviceCredential = (credential: Credential, identityKey: PublicKey, deviceKey: PublicKey): boolean => {
  const assertion = getCredentialAssertion(credential);
  return credential.subject.id.equals(deviceKey) &&
    assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
    assertion.identityKey.equals(identityKey) &&
    assertion.deviceKey.equals(deviceKey);
};
