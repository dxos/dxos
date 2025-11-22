//
// Copyright 2025 DXOS.org
//

/**
 * Getter to get object version.
 */

// TODO(burdon): Reconcile.
export const ObjectVersionId: unique symbol = Symbol.for('@dxos/echo/ObjectVersion');
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
