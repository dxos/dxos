//
// Copyright 2026 DXOS.org
//

import {
  type CreateAgentRequestBody,
  type DeleteIdentityRequest,
  type DeleteIdentityResponse,
  type InspectIdentityResponse,
  type InspectSpaceResponse,
  type ListActiveIdentitiesResponse,
  type SpaceActivityEntry,
  type UploadFunctionRequest,
} from './edge.ts';

//
// DX-1033 — legacy (pre-identityDid) wire shapes.
//
// These carry identity as a hex `identityKey`/`ownerPublicKey`. They are retained so the Edge
// continues to accept requests from, and the devtools CLI can still read responses produced by,
// clients/servers that predate the DID migration (notably Composer, which deploys on a delay).
// Drop in phase 7 once telemetry shows no legacy senders remain (see DX995_PHASE7_DROP_LEGACY.md).
//
// Each type omits the new DID field and re-adds the old hex field, so a `New | Legacy` union is
// discriminable cast-free via `'identityDid' in value`.
//

/** @deprecated Pre-DX-1033 shape; use {@link CreateAgentRequestBody} (`identityDid`). */
export type LegacyCreateAgentRequestBody = Omit<CreateAgentRequestBody, 'identityDid'> & {
  /** @deprecated Hex identity key; send `identityDid` instead. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link UploadFunctionRequest} (`ownerUri`). */
export type LegacyUploadFunctionRequest = Omit<UploadFunctionRequest, 'ownerUri'> & {
  /** @deprecated Hex owner public key; send `ownerUri` (the owner identity DID) instead. */
  ownerPublicKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link ListActiveIdentitiesResponse} (`identityDid`). */
export type LegacyListActiveIdentitiesResponse = {
  identities: {
    /** @deprecated Hex identity key; read `identityDid`. */
    identityKey: string;
    haloSpaceId: string | null;
    createdAt: string | null;
    agentKey: string | null;
    hasRecovery: boolean;
  }[];
  cursor?: string;
  complete: boolean;
  totalCount: number;
};

/** @deprecated Pre-DX-1033 shape; use `InspectIdentityRequest` (`identityDid`). */
export type LegacyInspectIdentityRequest = {
  /** @deprecated Hex identity key; send `identityDid`. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 metadata shape; use the `identityDid` form. */
export type LegacySpaceMetadata = {
  createdAt: string;
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey?: string;
  status?: 'active' | 'deleting';
};

/** @deprecated Pre-DX-1033 member shape; use the `identityDid` form. */
export type LegacySpaceMember = {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
  role?: string;
  agentKey?: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link InspectSpaceResponse} (`identityDid`). */
export type LegacyInspectSpaceResponse = Omit<InspectSpaceResponse, 'metadata' | 'members' | 'spaceId'> & {
  spaceId: string;
  metadata: LegacySpaceMetadata | null;
  members: { count: number; list: LegacySpaceMember[] };
};

/** @deprecated Pre-DX-1033 shape; use {@link InspectIdentityResponse} (`identityDid`). */
export type LegacyInspectIdentityResponse = Omit<InspectIdentityResponse, 'identityDid' | 'spaces'> & {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
  spaces: LegacyInspectSpaceResponse[];
};

/** @deprecated Pre-DX-1033 shape; use {@link SpaceActivityEntry} (`identityDid`). */
export type LegacySpaceActivityEntry = Omit<SpaceActivityEntry, 'metadata'> & {
  metadata: LegacySpaceMetadata | null;
};

/** @deprecated Pre-DX-1033 shape; use {@link DeleteIdentityRequest} (`identityDid`). */
export type LegacyDeleteIdentityRequest = Omit<DeleteIdentityRequest, 'identityDid'> & {
  /** @deprecated Hex identity key; send `identityDid`. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link DeleteIdentityResponse} (`identityDid`). */
export type LegacyDeleteIdentityResponse = Omit<DeleteIdentityResponse, 'identityDid'> & {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
};

