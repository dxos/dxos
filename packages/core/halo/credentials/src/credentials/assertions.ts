//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { bufWkt, toPublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';

import { type CredentialAssertion, ASSERTION_REGISTRY } from './assertion-registry';

/** Helper to convert buf PublicKey message (or @dxos/keys PublicKey) to @dxos/keys PublicKey. */
export const fromBufPublicKey = (key?: BufPublicKey | PublicKey): PublicKey | undefined =>
  key ? (key instanceof PublicKey ? key : PublicKey.from(key.data)) : undefined;

/** Extracts a specific assertion type from the CredentialAssertion union by $typeName. */
export type AssertionByTypeName<T extends CredentialAssertion['$typeName']> = Extract<
  CredentialAssertion,
  { $typeName: T }
>;

/**
 * Transitional return type preserving '@type' for consumers not yet migrated to $typeName.
 * Once all consumers use $typeName, the '& { "@type": string }' can be dropped.
 */
export type NormalizedAssertion = CredentialAssertion & { '@type': string };

/**
 * Extract the assertion from a credential.
 *
 * Handles both formats:
 * - Buf-native google.protobuf.Any (typeUrl + binary value) via anyUnpack.
 * - Legacy protobuf.js TypedMessage (@type + inline fields) with $typeName normalization.
 *
 * Both '@type' and '$typeName' are guaranteed on the returned object.
 */
export const getCredentialAssertion = (credential: Credential): NormalizedAssertion => {
  const any = credential.subject!.assertion;

  // Try buf-native anyUnpack for properly encoded Any (typeUrl + binary value).
  if (any && any.typeUrl && any.value && any.value.length > 0) {
    const unpacked = bufWkt.anyUnpack(any as bufWkt.Any, ASSERTION_REGISTRY);
    if (unpacked) {
      (unpacked as Record<string, unknown>)['@type'] = unpacked.$typeName;
      return unpacked as NormalizedAssertion;
    }
  }

  // Fallback: inline TypedMessage from protobuf.js codec.
  const assertion = any as Record<string, unknown>;
  if (!assertion.$typeName && assertion['@type']) {
    assertion.$typeName = assertion['@type'];
  }
  if (!assertion['@type'] && assertion.$typeName) {
    assertion['@type'] = assertion.$typeName;
  }
  return assertion as NormalizedAssertion;
};

/**
 * Extract a typed assertion from a credential, returning undefined if the type doesn't match.
 */
export const getTypedAssertion = <T extends CredentialAssertion['$typeName']>(
  credential: Credential,
  typeName: T,
): AssertionByTypeName<T> | undefined => {
  const assertion = getCredentialAssertion(credential);
  return assertion.$typeName === typeName ? (assertion as unknown as AssertionByTypeName<T>) : undefined;
};

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): boolean => {
  const assertion = getCredentialAssertion(credential);
  if (assertion.$typeName !== 'dxos.halo.credentials.AuthorizedDevice') {
    return false;
  }
  const subjectId = fromBufPublicKey(credential.subject?.id);
  const issuer = fromBufPublicKey(credential.issuer);
  const assertionIdentityKey = assertion.identityKey ? toPublicKey(assertion.identityKey) : undefined;
  const assertionDeviceKey = assertion.deviceKey ? toPublicKey(assertion.deviceKey) : undefined;
  return (
    subjectId?.equals(deviceKey) === true &&
    issuer?.equals(identityKey) === true &&
    assertionIdentityKey?.equals(identityKey) === true &&
    assertionDeviceKey?.equals(deviceKey) === true
  );
};

/**
 * Strips buf Message metadata ($typeName, $unknown) from a type
 * to avoid conflicts when intersecting with google.protobuf.Any.
 */
type StripMessageMeta<T> = Omit<T, '$typeName' | '$unknown'>;

/**
 * A Credential with a narrowed assertion type.
 * Uses StripMessageMeta to avoid $typeName conflict between
 * google.protobuf.Any and the specific assertion message type.
 */
export type SpecificCredential<T> = Credential & {
  subject: { assertion: StripMessageMeta<T> };
};

export const checkCredentialType = <T extends CredentialAssertion['$typeName']>(
  credential: Credential,
  typeName: T,
): credential is SpecificCredential<AssertionByTypeName<T>> =>
  getCredentialAssertion(credential).$typeName === typeName;

export const credentialTypeFilter =
  <T extends CredentialAssertion['$typeName']>(typeName: T) =>
  (credential: Credential): credential is SpecificCredential<AssertionByTypeName<T>> =>
    checkCredentialType(credential, typeName);
