//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { type PublicKey as BufPublicKey, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type TYPES, type TypedMessage } from '@dxos/protocols/proto';

/** Helper to convert buf PublicKey message to @dxos/keys PublicKey. */
const fromBufPublicKey = (key?: BufPublicKey): PublicKey | undefined => (key ? PublicKey.from(key.data) : undefined);

export const getCredentialAssertion = (credential: Credential): TypedMessage => credential.subject!.assertion;

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): boolean => {
  const assertion = getCredentialAssertion(credential);
  const subjectId = fromBufPublicKey(credential.subject?.id);
  const issuer = fromBufPublicKey(credential.issuer);
  const assertionIdentityKey = assertion.identityKey
    ? PublicKey.from(assertion.identityKey.data ?? assertion.identityKey)
    : undefined;
  const assertionDeviceKey = assertion.deviceKey
    ? PublicKey.from(assertion.deviceKey.data ?? assertion.deviceKey)
    : undefined;
  return (
    subjectId?.equals(deviceKey) === true &&
    issuer?.equals(identityKey) === true &&
    assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
    assertionIdentityKey?.equals(identityKey) === true &&
    assertionDeviceKey?.equals(deviceKey) === true
  );
};

export type SpecificCredential<T> = Omit<Credential, 'subject'> & {
  subject: Omit<Credential['subject'], 'assertion'> & { assertion: T };
};

export const checkCredentialType = <K extends keyof TYPES>(
  credential: Credential,
  type: K,
): credential is SpecificCredential<TYPES[K]> => credential.subject!.assertion['@type'] === type;

export const credentialTypeFilter =
  <K extends keyof TYPES>(type: K) =>
  (credential: Credential): credential is SpecificCredential<TYPES[K]> =>
    checkCredentialType(credential, type);
