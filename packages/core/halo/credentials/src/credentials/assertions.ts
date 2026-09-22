//
// Copyright 2022 DXOS.org
//

import { anyUnpack } from '@bufbuild/protobuf/wkt';

import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import {
  type AdmittedFeed,
  type Auth,
  type AuthorizedDevice,
  type Credential,
  type DefaultSpace,
  type DeviceProfile,
  type Epoch,
  type HaloSpace,
  type IdentityProfile,
  type IdentityRecovery,
  type IdentityRecoveryRevoked,
  type MemberProfile,
  type ServiceAccess,
  type SpaceDeleted,
  type SpaceGenesis,
  type SpaceMember,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type CancelDelegatedInvitation,
  type DelegateSpaceInvitation,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';

/**
 * Every assertion a credential's subject can carry.
 *
 * This is the package's public discriminated union, and it is discriminated on buf's own
 * `$typeName` rather than the legacy codec's `'@type'` key. Declared explicitly rather than derived
 * from the registry so narrowing stays exhaustive and a new assertion type is a deliberate addition.
 */
export type CredentialAssertion =
  | AdmittedFeed
  | Auth
  | AuthorizedDevice
  | DefaultSpace
  | DeviceProfile
  | Epoch
  | HaloSpace
  | IdentityProfile
  | IdentityRecovery
  | IdentityRecoveryRevoked
  | MemberProfile
  | ServiceAccess
  | SpaceDeleted
  | SpaceGenesis
  | SpaceMember
  | CancelDelegatedInvitation
  | DelegateSpaceInvitation;

/** The `$typeName` of any assertion, usable as the discriminant in a narrowing comparison. */
export type CredentialAssertionType = CredentialAssertion['$typeName'];

/**
 * Unpacks the assertion a credential asserts about its subject.
 *
 * Throws rather than returning undefined: a credential without a resolvable assertion asserts
 * nothing, and every caller here treats that as malformed input rather than a case to handle.
 */
export const getCredentialAssertion = (credential: Credential): CredentialAssertion => {
  const assertion = credential.subject?.assertion;
  invariant(assertion, 'Credential has no assertion.');
  const unpacked = anyUnpack(assertion, bufRegistry);
  invariant(unpacked, `Unresolvable credential assertion: ${assertion.typeUrl}`);
  return unpacked as CredentialAssertion;
};

export const isValidAuthorizedDeviceCredential = (
  credential: Credential,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): boolean => {
  const assertion = getCredentialAssertion(credential);
  return (
    assertion.$typeName === 'dxos.halo.credentials.AuthorizedDevice' &&
    !!toPublicKey(credential.subject?.id)?.equals(deviceKey) &&
    !!toPublicKey(credential.issuer)?.equals(identityKey) &&
    !!toPublicKey(assertion.identityKey)?.equals(identityKey) &&
    !!toPublicKey(assertion.deviceKey)?.equals(deviceKey)
  );
};

/**
 * A credential paired with the assertion it carries.
 *
 * The assertion lives inside an `Any`, which no type predicate can narrow in place, so the narrowed
 * assertion is carried alongside the credential rather than substituted into its `subject`.
 */
export type SpecificCredential<T extends CredentialAssertion> = { credential: Credential; assertion: T };

/**
 * Pairs a credential with its assertion when the assertion is of the given type.
 *
 * Replaces the legacy type predicate: narrowing has to produce a value here, since the assertion is
 * packed rather than inlined.
 */
export const specificCredential = <T extends CredentialAssertion>(
  credential: Credential,
  type: T['$typeName'],
): SpecificCredential<T> | undefined => {
  const assertion = credential.subject?.assertion && anyUnpack(credential.subject.assertion, bufRegistry);
  return assertion?.$typeName === type ? { credential, assertion: assertion as T } : undefined;
};

/** Keeps only the credentials asserting the given type, paired with the narrowed assertion. */
export const credentialsOfType =
  <T extends CredentialAssertion>(type: T['$typeName']) =>
  (credentials: Credential[]): SpecificCredential<T>[] =>
    credentials.flatMap((credential) => specificCredential<T>(credential, type) ?? []);
