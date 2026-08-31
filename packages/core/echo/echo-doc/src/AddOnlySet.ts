//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

//
// A map whose entries cannot be removed, even by a peer with write access.
//
// Automerge resolves a delete by hiding the entry from the materialized document, but the change
// that added it stays in the history, so reading the history rather than the current state makes
// erasure ineffective: a member who can write to the document must not be able to revoke another
// member by deleting their credential. A key written more than once keeps its first value, so an
// overwrite cannot displace an entry either.
//

import { next as A } from '@automerge/automerge';

import { assertArgument } from '@dxos/invariant';

/**
 * Entries are read back from the change history, where only a scalar is a single op carrying its own
 * value; a JS string becomes a text CRDT whose value exists only after replaying its character ops,
 * which is the replay this module exists to avoid.
 */
export type Value = Uint8Array;

export type Entries = { [key: string]: Value };

/** Adds an entry, leaving any existing entry for the key untouched. */
export const add = (entries: Entries, key: string, value: Value): void => {
  assertArgument(key.length > 0, 'key', 'expect a non-empty key');
  if (entries[key] === undefined) {
    entries[key] = value;
  }
};

/**
 * Every entry ever added at `path`, including entries deleted or overwritten in the current state.
 * Returns an empty map when the path holds no set.
 */
export const read = <T>(doc: A.Doc<T>, path: readonly string[]): Map<string, Value> => {
  assertArgument(path.length > 0, 'path', 'expect a non-empty path');

  const targetPath = path.join('.');
  const entries = new Map<string, Value>();
  // The set's object id has to be recovered from the history too: a delete of the set itself would
  // otherwise leave nothing to resolve the path against.
  const setObjectIds = new Set<string>();
  const pathObjectIds = new Map<string, string>([['', '_root']]);

  for (const change of A.getAllChanges(doc)) {
    const { actor, startOp, ops } = A.decodeChange(change);

    ops.forEach((op, index) => {
      // Automerge numbers ops sequentially from the change's `startOp`, which is what makes an op's
      // own id derivable here and lets a nested object be matched to the op that created it.
      const opId = `${BigInt(startOp) + BigInt(index)}@${actor}`;

      if (op.action === 'makeMap' && typeof op.key === 'string') {
        const parent = objectPath(pathObjectIds, op.obj);
        if (parent !== undefined) {
          const childPath = parent === '' ? op.key : `${parent}.${op.key}`;
          pathObjectIds.set(childPath, opId);
          if (childPath === targetPath) {
            setObjectIds.add(opId);
          }
        }
        return;
      }

      if (op.action === 'set' && setObjectIds.has(op.obj) && typeof op.key === 'string' && !entries.has(op.key)) {
        const value = toBytes(op.value);
        if (value) {
          entries.set(op.key, value);
        }
      }
    });
  }

  return entries;
};

/** `decodeChange` returns byte values as a plain array rather than the `Uint8Array` that was stored. */
const toBytes = (value: unknown): Value | undefined => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value) && value.every((byte) => typeof byte === 'number')) {
    return new Uint8Array(value);
  }
  return undefined;
};

const objectPath = (pathObjectIds: Map<string, string>, objectId: string): string | undefined => {
  for (const [candidatePath, candidateId] of pathObjectIds) {
    if (candidateId === objectId) {
      return candidatePath;
    }
  }
  return undefined;
};
