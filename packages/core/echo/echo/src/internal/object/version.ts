//
// NOTE: Those types must match the ones defined at @dxos/echo. We duplicated them murely due to technical constrains.
//

/**
 * Getter to get object version.
 */
//
// Copyright 2025 DXOS.org
//

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
