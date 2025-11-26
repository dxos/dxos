//
// Copyright 2025 DXOS.org
//

/**
 * Version type symbol.
 */
export const VersionTypeId: unique symbol = Symbol.for('@dxos/echo/VersionTypeId');

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
