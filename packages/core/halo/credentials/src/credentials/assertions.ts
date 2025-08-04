//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { type TYPES, type TypedMessage } from '@dxos/protocols/proto';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export const getCredentialAssertion = (credential: Credential): TypedMessage => credential.subject.assertion;

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): boolean => {
  const assertion = getCredentialAssertion(credential);
  return (
    credential.subject.id.equals(deviceKey) &&
    credential.issuer.equals(identityKey) &&
    assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
    assertion.identityKey.equals(identityKey) &&
    assertion.deviceKey.equals(deviceKey)
  );
};

export type SpecificCredential<T> = Omit<Credential, 'subject'> & {
  subject: Omit<Credential['subject'], 'assertion'> & { assertion: T };
};

export const checkCredentialType = <K extends keyof TYPES>(
  credential: Credential,
  type: K,
): credential is SpecificCredential<TYPES[K]> => credential.subject.assertion['@type'] === type;

export const credentialTypeFilter =
  <K extends keyof TYPES>(type: K) =>
  (credential: Credential): credential is SpecificCredential<TYPES[K]> =>
    checkCredentialType(credential, type);
