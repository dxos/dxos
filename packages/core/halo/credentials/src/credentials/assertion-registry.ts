//
// Copyright 2026 DXOS.org
//

import { type DescMessage, buf } from '@dxos/protocols/buf';

import {
  type AdmittedFeed,
  AdmittedFeedSchema,
  type Auth,
  AuthSchema,
  type AuthorizedDevice,
  AuthorizedDeviceSchema,
  type DefaultSpace,
  DefaultSpaceSchema,
  type DeviceProfile,
  DeviceProfileSchema,
  type Epoch,
  EpochSchema,
  type HaloSpace,
  HaloSpaceSchema,
  type IdentityProfile,
  IdentityProfileSchema,
  type IdentityRecovery,
  IdentityRecoverySchema,
  type KubeAccess,
  KubeAccessSchema,
  type MemberProfile,
  MemberProfileSchema,
  type ServiceAccess,
  ServiceAccessSchema,
  type SpaceGenesis,
  SpaceGenesisSchema,
  type SpaceMember,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/**
 * All valid credential assertion message types.
 * Each is a buf-generated message tagged with `$typeName`.
 */
export type CredentialAssertion =
  | SpaceGenesis
  | SpaceMember
  | MemberProfile
  | AuthorizedDevice
  | AdmittedFeed
  | Epoch
  | HaloSpace
  | IdentityRecovery
  | IdentityProfile
  | DeviceProfile
  | DefaultSpace
  | KubeAccess
  | ServiceAccess
  | Auth;

/**
 * All assertion schemas, ordered to match the CredentialAssertion union.
 */
export const ASSERTION_SCHEMAS = [
  SpaceGenesisSchema,
  SpaceMemberSchema,
  MemberProfileSchema,
  AuthorizedDeviceSchema,
  AdmittedFeedSchema,
  EpochSchema,
  HaloSpaceSchema,
  IdentityRecoverySchema,
  IdentityProfileSchema,
  DeviceProfileSchema,
  DefaultSpaceSchema,
  KubeAccessSchema,
  ServiceAccessSchema,
  AuthSchema,
] as const satisfies readonly DescMessage[];

/**
 * Registry for credential assertion types.
 * Used with `anyPack`/`anyUnpack` from `@bufbuild/protobuf/wkt` for proper
 * google.protobuf.Any serialization of assertion fields.
 *
 * Usage:
 *   const assertion = anyUnpack(credential.subject.assertion, ASSERTION_REGISTRY);
 *   if (assertion && assertion.$typeName === 'dxos.halo.credentials.SpaceMember') { ... }
 */
export const ASSERTION_REGISTRY: buf.Registry = buf.createRegistry(...ASSERTION_SCHEMAS);

/**
 * Map from assertion $typeName to schema descriptor.
 */
export const ASSERTION_SCHEMA_MAP: ReadonlyMap<string, DescMessage> = new Map(
  ASSERTION_SCHEMAS.map((schema) => [schema.typeName, schema]),
);
