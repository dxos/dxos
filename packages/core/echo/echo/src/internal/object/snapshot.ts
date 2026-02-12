//
// Copyright 2024 DXOS.org
//

import { deepMapValues } from '@dxos/util';

import { ObjectDatabaseId } from '../entities/model';
import { RelationSourceDXNId, RelationSourceId, RelationTargetDXNId, RelationTargetId } from '../entities/relation';
import { KindId, SnapshotKindId } from '../types/entity';
import { MetaId } from '../types/meta';
import { SchemaId, TypeId } from '../types/typename';

/**
 * Copy a Symbol-keyed property from source to target if it has a defined value.
 * Handles both plain objects (symbol in source) and proxies where get returns a value
 * but has/in returns false (e.g. ObjectDatabaseId on echo-db proxies).
 */
const copySymbolProperty = (source: any, target: any, symbol: symbol): void => {
  let value: unknown;
  // Echo-db proxy getters (e.g. RelationSourceId, RelationTargetId) can throw in certain states.
  try {
    value = source[symbol];
  } catch {
    return;
  }
  if (value !== undefined) {
    Object.defineProperty(target, symbol, {
      value,
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
  if (obj != null && typeof obj === 'object') {
    const source = obj as any;

    // Type introspection symbols.
    copySymbolProperty(source, snapshot, TypeId);
    copySymbolProperty(source, snapshot, SchemaId);

    // Database reference (required for Obj.getDatabase to work on snapshots).
    copySymbolProperty(source, snapshot, ObjectDatabaseId);

    // Metadata symbol. -- deep clone to ensure immutability.
    if (MetaId in source) {
      Object.defineProperty(snapshot, MetaId, {
        value: {
          keys: [...(source[MetaId]?.keys ?? [])],
          tags: [...(source[MetaId]?.tags ?? [])],
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }

    // Relation endpoint symbols.
    copySymbolProperty(source, snapshot, RelationSourceDXNId);
    copySymbolProperty(source, snapshot, RelationTargetDXNId);
    copySymbolProperty(source, snapshot, RelationSourceId);
    copySymbolProperty(source, snapshot, RelationTargetId);
  }

  return Object.freeze(snapshot) as T;
};
