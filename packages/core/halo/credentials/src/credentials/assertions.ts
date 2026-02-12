//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';
import { type TYPES, type TypedMessage } from '@dxos/protocols/proto';

/** Helper to convert buf PublicKey message to @dxos/keys PublicKey. */
export const fromBufPublicKey = (key?: BufPublicKey): PublicKey | undefined =>
  key ? PublicKey.from(key.data) : undefined;

/**
 * Extract the assertion from a credential as a TypedMessage.
 * At runtime, the `assertion` field (typed as google.protobuf.Any in buf schema)
 * contains a TypedMessage object from the protobuf.js codec.
 */
export const getCredentialAssertion = (credential: Credential): TypedMessage =>
  credential.subject!.assertion as unknown as TypedMessage;

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): boolean => {
  const assertion = getCredentialAssertion(credential);
  if (assertion['@type'] !== 'dxos.halo.credentials.AuthorizedDevice') {
    return false;
  }
  const subjectId = fromBufPublicKey(credential.subject?.id);
  const issuer = fromBufPublicKey(credential.issuer);
  // After narrowing, assertion.identityKey and assertion.deviceKey are @dxos/keys PublicKey
  // (proto codec applies PublicKey substitution).
  return (
    subjectId?.equals(deviceKey) === true &&
    issuer?.equals(identityKey) === true &&
    assertion.identityKey?.equals(identityKey) === true &&
    assertion.deviceKey?.equals(deviceKey) === true
  );
};

/**
 * A Credential with a narrowed assertion type.
 * Uses intersection to remain assignable to Credential.
 */
export type SpecificCredential<T> = Credential & {
  subject: { assertion: T };
};

export const checkCredentialType = <K extends keyof TYPES>(
  credential: Credential,
  type: K,
): credential is SpecificCredential<TYPES[K]> => getCredentialAssertion(credential)['@type'] === type;

export const credentialTypeFilter =
  <K extends keyof TYPES>(type: K) =>
  (credential: Credential): credential is SpecificCredential<TYPES[K]> =>
    checkCredentialType(credential, type);
