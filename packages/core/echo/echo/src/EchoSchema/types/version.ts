//
// Copyright 2025 DXOS.org
//

/**
 * Getter to get object version.
 */

export const VersionTypeId: unique symbol = Symbol('@dxos/echo/Version');

/**
 * Represent object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export interface Version {
  [VersionTypeId]: {};
  automergeHeads?: string[];
}
