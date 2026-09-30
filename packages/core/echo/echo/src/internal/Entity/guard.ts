//
// Copyright 2026 DXOS.org
//

import type * as Entity from '../../Entity.ts';
import * as Error from '../../Error.ts';
import { EntityKind, KindId, SnapshotKindId } from '../common/types/index.ts';

/**
 * Returns true if the value is an ECHO entity instance (object or relation).
 */
export const isEntity = (value: unknown): value is Entity.Unknown => {
  // (some) type entities are functions since they are class declarations.
  if (value == null || (typeof value !== 'object' && typeof value !== 'function')) {
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

/**
 * Returns true if the value is an ECHO event instance.
 */
export const isEventEntity = (value: unknown): boolean =>
  isEntity(value) && (value as any)[KindId] === EntityKind.Event;

/**
 * Throws when `value` is an event, for operations events do not support.
 */
export const assertNotEvent = (value: unknown, operation: string): void => {
  if (isEventEntity(value)) {
    throw new Error.EventNotSupportedError(operation);
  }
};
