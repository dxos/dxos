//
// Copyright 2025 DXOS.org
//

export const VersionTypeId: unique symbol = Symbol('@dxos/echo/Version');

export type VersionType = typeof VersionTypeId;

/**
 * Represent object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export interface Version {
  [VersionTypeId]: {};
  automergeHeads?: string[];
}
