//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads, type Patch } from '@automerge/automerge';

import { Mirror } from '@dxos/echo-protocol';

/**
 * Change message a batch is written with, so a restarted worker can tell which batches it already
 * applied. Ids are random per tab session, so they never collide across devices.
 */
export type BatchMessage = { mirror: { clientId: string; batchId: string } };

export const encodeBatchMessage = (clientId: string, batchId: string): string =>
  JSON.stringify({ mirror: { clientId, batchId } } satisfies BatchMessage);

export const decodeBatchMessage = (message: string | null | undefined): BatchMessage['mirror'] | undefined => {
  if (!message || !message.startsWith('{"mirror"')) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(message);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'mirror' in parsed &&
      typeof parsed.mirror === 'object' &&
      parsed.mirror !== null &&
      'clientId' in parsed.mirror &&
      'batchId' in parsed.mirror &&
      typeof parsed.mirror.clientId === 'string' &&
      typeof parsed.mirror.batchId === 'string'
    ) {
      return { clientId: parsed.mirror.clientId, batchId: parsed.mirror.batchId };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

/**
 * Copies an Automerge document (or part of one) into a plain frozen mirror value. Text becomes
 * strings; RawString, bytes and dates stay as they are.
 */
export const toMirror = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => toMirror(entry)));
  }
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = toMirror(entry);
    }
    return Object.freeze(copy);
  }
  return value;
};

/** Copies a mirror value into a fresh plain structure Automerge can store. */
const toAutomerge = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toAutomerge(entry));
  }
  if (Mirror.isContainer(value)) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = toAutomerge(entry);
    }
    return copy;
  }
  if (value instanceof A.RawString) {
    return new A.RawString(value.toString());
  }
  return value;
};

type Draft = Record<string | number, unknown>;

const isDraftList = (
  value: unknown,
): value is unknown[] & {
  insertAt: (index: number, ...values: unknown[]) => void;
  deleteAt: (index: number, count: number) => void;
} => Array.isArray(value);

const isDraftMap = (value: unknown): value is Draft => typeof value === 'object' && value !== null;

/**
 * Applies mirror ops inside an Automerge change callback, at exact positions. Ops that no longer fit
 * are skipped; the sequencer's transforms normally rule them out.
 */
export const applyOpsToDraft = (draft: unknown, ops: readonly Mirror.Op[]): number => {
  let skipped = 0;
  for (const op of ops) {
    if (op.type === 'splice') {
      const text = Mirror.getAt(draft, op.path);
      if (typeof text !== 'string' || op.index + op.remove > text.length) {
        skipped++;
        continue;
      }
      if (!isDraftMap(draft)) {
        skipped++;
        continue;
      }
      A.splice(draft, [...op.path], op.index, op.remove, op.insert);
      continue;
    }

    const parent = Mirror.getAt(draft, op.path.slice(0, -1));
    const key = op.path[op.path.length - 1];
    if (isDraftList(parent)) {
      const index = Number(key);
      switch (op.type) {
        case 'put':
          if (index < parent.length) {
            parent[index] = toAutomerge(op.value);
            continue;
          }
          break;
        case 'insert':
          if (index <= parent.length) {
            parent.insertAt(index, ...op.values.map((value) => toAutomerge(value)));
            continue;
          }
          break;
        case 'remove':
          if (index + op.count <= parent.length) {
            parent.deleteAt(index, op.count);
            continue;
          }
          break;
      }
      skipped++;
      continue;
    }
    if (isDraftMap(parent)) {
      switch (op.type) {
        case 'put':
          parent[String(key)] = toAutomerge(op.value);
          continue;
        case 'del':
          if (String(key) in parent) {
            delete parent[String(key)];
            continue;
          }
          break;
      }
    }
    skipped++;
  }
  return skipped;
};

/**
 * Converts the patches of `A.diff(doc, before, after)` into mirror ops that take a mirror of
 * `before` to a mirror of `after`. Patches apply in order; the after-document tells text deletions
 * from list removals and RawString values from text, which patches leave ambiguous.
 */
export const patchesToOps = (patches: readonly Patch[], after: unknown): Mirror.Op[] => {
  const ops: Mirror.Op[] = [];
  const isRaw = (path: readonly (string | number)[]) => Mirror.getAt(after, path) instanceof A.RawString;
  for (const patch of patches) {
    switch (patch.action) {
      case 'put': {
        const value =
          typeof patch.value === 'string' && isRaw(patch.path) ? new A.RawString(patch.value) : toMirror(patch.value);
        ops.push({ type: 'put', path: patch.path, value });
        break;
      }
      case 'del': {
        const parentPath = patch.path.slice(0, -1);
        const index = patch.path[patch.path.length - 1];
        const parent = Mirror.getAt(after, parentPath);
        if (typeof parent === 'string' || parent instanceof A.RawString) {
          ops.push({ type: 'splice', path: parentPath, index: Number(index), remove: patch.length ?? 1, insert: '' });
        } else if (typeof index === 'number') {
          ops.push({ type: 'remove', path: patch.path, count: patch.length ?? 1 });
        } else {
          ops.push({ type: 'del', path: patch.path });
        }
        break;
      }
      case 'insert': {
        const listPath = patch.path.slice(0, -1);
        const start = Number(patch.path[patch.path.length - 1]);
        const values = patch.values.map((value, offset) =>
          typeof value === 'string' && isRaw([...listPath, start + offset]) ? new A.RawString(value) : toMirror(value),
        );
        ops.push({ type: 'insert', path: patch.path, values });
        break;
      }
      case 'splice': {
        const textPath = patch.path.slice(0, -1);
        ops.push({
          type: 'splice',
          path: textPath,
          index: Number(patch.path[patch.path.length - 1]),
          remove: 0,
          insert: patch.value,
        });
        break;
      }
      default:
        // Counters, marks and conflict flags are unused by ECHO documents and change no mirrored value.
        break;
    }
  }
  return ops;
};

/** Ops taking a mirror of the document at `before` to a mirror at `after`. */
export const diffToOps = (doc: A.Doc<unknown>, before: Heads, after: Heads): Mirror.Op[] => {
  if (A.equals(before, after)) {
    return [];
  }
  return patchesToOps(A.diff(doc, before, after), A.equals(after, A.getHeads(doc)) ? doc : A.view(doc, after));
};
