//
// Copyright 2025 DXOS.org
//

/**
 * Version type identifier.
 */
export const VersionTypeId = '~@dxos/echo/VersionTypeId' as const;
export type VersionTypeId = typeof VersionTypeId;

/**
 * Represents the object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export interface Version {
  [VersionTypeId]: {};
  automergeHeads?: string[];
}
