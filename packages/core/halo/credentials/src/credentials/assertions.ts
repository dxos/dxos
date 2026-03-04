//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { bufWkt, toPublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';

import { ASSERTION_REGISTRY, type CredentialAssertion } from './assertion-registry';
import type { UnpackedCredential } from './credential';

/** Helper to convert buf PublicKey message (or @dxos/keys PublicKey) to @dxos/keys PublicKey. */
export const fromBufPublicKey = (key?: BufPublicKey | PublicKey): PublicKey | undefined =>
  key ? (key instanceof PublicKey ? key : PublicKey.from(key.data)) : undefined;

/** Extracts a specific assertion type from the CredentialAssertion union by $typeName. */
export type AssertionByTypeName<T extends CredentialAssertion['$typeName']> = Extract<
  CredentialAssertion,
  { $typeName: T }
>;

/**
 * A Credential with a narrowed assertion type.
 * Uses StripMessageMeta to avoid $typeName conflict between
 * google.protobuf.Any and the specific assertion message type.
 *
 * @deprecated Use UnpackedCredential instead.
 */
export type SpecificCredential<T extends CredentialAssertion> = UnpackedCredential<T>;

export const isCredentialType = <T extends CredentialAssertion['$typeName']>(
  credential: UnpackedCredential,
  typeName: T,
): credential is UnpackedCredential<AssertionByTypeName<T>> => credential.subject.assertion.$typeName === typeName;

export const credentialTypePredicate =
  <T extends CredentialAssertion['$typeName']>(typeName: T) =>
  (credential: UnpackedCredential): credential is UnpackedCredential<AssertionByTypeName<T>> =>
    isCredentialType(credential, typeName);
