//
// Copyright 2024 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import {
  KindId,
  ObjectDatabaseId,
  ObjectDeletedId,
  ParentId,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SchemaId,
  SelfURIId,
  SnapshotKindId,
  TypeEntityId,
  TypeId,
} from '../common/types';
import { MetaId } from '../common/types/model-symbols';

/**
 * Copy a Symbol-keyed property from source to target if it has a defined value.
 * Handles both plain objects (symbol in source) and proxies where get returns a value
 * but has/in returns false (e.g. ObjectDatabaseId on echo-db proxies).
 * Optional transform clones or mutates the value before assignment (e.g. for MetaId).
 */
const copySymbolProperty = (
  source: any,
  target: any,
  symbol: symbol,
  transform?: (value: unknown) => unknown,
): void => {
  let value: unknown;
  // Echo-db proxy getters (e.g. RelationSourceId, RelationTargetId) can throw in certain states.
  try {
    value = source[symbol];
  } catch {
    return;
  }
  if (value !== undefined) {
    const finalValue = transform ? transform(value) : value;
    Object.defineProperty(target, symbol, {
      value: finalValue,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
};

/**
 * Returns an immutable snapshot of the reactive object.
 * The snapshot is branded with SnapshotKindId (not KindId).
 */
export const getSnapshot = <T extends object>(obj: T): T => {
  assertArgument(typeof obj === 'object' && obj !== null && KindId in obj, 'obj', 'must be an entity');

  const snapshot = deepMapValues(obj, (value, recurse) => {
    // Do not recurse on references (but do recurse on arrays).
    if (
      typeof value === 'object' &&
      value !== null &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      !Array.isArray(value)
    ) {
      return value;
    }

    return recurse(value);
  }) as any;

  // Add SnapshotKindId brand based on original KindId.
  if (obj != null && typeof obj === 'object' && KindId in obj) {
    snapshot[SnapshotKindId] = (obj as any)[KindId];
  }

  // Preserve Symbol-keyed properties that are important for type introspection.
  // These are not copied by deepMapValues since Object.keys() doesn't include symbols.
  const source = obj as any;

  // Type introspection symbols.
  copySymbolProperty(source, snapshot, TypeId);
  copySymbolProperty(source, snapshot, SchemaId);
  copySymbolProperty(source, snapshot, TypeEntityId);
  copySymbolProperty(source, snapshot, SelfURIId);

  // Database reference (required for Obj.getDatabase to work on snapshots).
  copySymbolProperty(source, snapshot, ObjectDatabaseId);
  copySymbolProperty(source, snapshot, ObjectDeletedId);

  // Parent reference (required for Obj.getParent to work on snapshots).
  copySymbolProperty(source, snapshot, ParentId);

  // Metadata symbol. Copy arrays/objects so the snapshot is not affected by mutations to the live meta.
  copySymbolProperty(source, snapshot, MetaId, (meta: any) => ({
    keys: [...(meta?.keys ?? [])],
    tags: [...(meta?.tags ?? [])],
    ...(meta?.key != null ? { key: meta.key } : {}),
    ...(meta?.version != null ? { version: meta.version } : {}),
    ...(meta?.annotations ? { annotations: { ...meta.annotations } } : {}),
  }));

  // Relation endpoint symbols.
  copySymbolProperty(source, snapshot, RelationSourceDXNId);
  copySymbolProperty(source, snapshot, RelationTargetDXNId);
  copySymbolProperty(source, snapshot, RelationSourceId);
  copySymbolProperty(source, snapshot, RelationTargetId);

  return Object.freeze(snapshot) as T;
};
