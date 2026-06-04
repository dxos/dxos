//
// Copyright 2026 DXOS.org
//

import type * as Entity from '../../Entity';
import { KindId, SnapshotKindId } from '../common/types';

/**
 * Returns true if the value is an ECHO entity instance (object or relation).
 */
export const isEntity = (value: unknown): value is Entity.Unknown => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[KindId] !== undefined;
};

/**
 * Returns true if the value is an ECHO entity snapshot.
 */
export const isSnapshot = (value: unknown): value is Entity.Snapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[SnapshotKindId] !== undefined;
};
