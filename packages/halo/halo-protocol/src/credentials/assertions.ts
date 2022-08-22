//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Credential } from '../proto/gen/dxos/halo/credentials';
import { getCredentialAssertion } from './types';

export const isValidAuthorizedDeviceCredential = (credential: Credential, device: PublicKey, identity: PublicKey): boolean => {
  const assertion = getCredentialAssertion(credential);
  return credential.subject.id.equals(device) &&
    assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
    assertion.identityKey.equals(identity) &&
    assertion.deviceKey.equals(device);
};
