//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { next as A, type Heads, type Patch } from '@automerge/automerge';

import * as Op from './Op.ts';
import type * as Sync from './Sync.ts';

/**
 * Change message a batch is written with, so a restarted host can tell which batches it already
 * applied, and which change of one it refused. Ids are random per client session, so they never
 * collide across devices. The `mirror` key is stored in documents, so it stays.
 */
export type BatchMessage = { mirror: Sync.Origin };

export const encodeBatchMessage = (clientId: string, batchId: string, refusedAt?: number): string =>
  JSON.stringify({
    mirror: { clientId, batchId, ...(refusedAt === undefined ? {} : { refusedAt }) },
  } satisfies BatchMessage);

export const decodeBatchMessage = (message: string | null | undefined): Sync.Origin | undefined => {
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
      const { clientId, batchId } = parsed.mirror;
      const refusedAt = 'refusedAt' in parsed.mirror ? parsed.mirror.refusedAt : undefined;
      return { clientId, batchId, ...(typeof refusedAt === 'number' ? { refusedAt } : {}) };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

/**
 * Copies an Automerge document (or part of one) into a plain frozen proxy value. Text becomes
 * strings; RawString, bytes and dates stay as they are.
 */
export const toValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => toValue(entry)));
  }
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = toValue(entry);
    }
    return Object.freeze(copy);
  }
  return value;
};

/** Copies a proxy value into a fresh plain structure Automerge can store. */
const toAutomerge = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toAutomerge(entry));
  }
  if (Op.isContainer(value)) {
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
 * Applies proxy ops inside an Automerge change callback, at exact positions. Ops that no longer fit
 * are skipped; the sequencer's transforms normally rule them out.
 */
export const applyOps = (draft: unknown, ops: readonly Op.Any[]): number => {
  let skipped = 0;
  for (const op of ops) {
    if (op.type === 'splice') {
      const text = Op.getAt(draft, op.path);
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

    const parent = Op.getAt(draft, op.path.slice(0, -1));
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
 * Converts the patches of `A.diff(doc, before, after)` into proxy ops that take a proxy of
 * `before` to a proxy of `after`. Patches apply in order. RawString values arrive as instances; a
 * new text arrives as an empty string followed by splices. The after-document tells text deletions
 * from list removals: a deletion's parent path is final, since Automerge reports an object's own
 * patches before those of its children.
 */
export const patchesToOps = (patches: readonly Patch[], after: unknown): Op.Any[] => {
  const ops: Op.Any[] = [];
  for (const patch of patches) {
    switch (patch.action) {
      case 'put': {
        ops.push({ type: 'put', path: patch.path, value: toValue(patch.value) });
        break;
      }
      case 'del': {
        const parentPath = patch.path.slice(0, -1);
        const index = patch.path[patch.path.length - 1];
        const parent = Op.getAt(after, parentPath);
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
        ops.push({ type: 'insert', path: patch.path, values: patch.values.map((value) => toValue(value)) });
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
        // Counters, marks and conflict flags change no proxy value.
        break;
    }
  }
  return ops;
};

/** Ops taking a proxy of the document at `before` to a proxy at `after`. */
export const diffToOps = (doc: A.Doc<unknown>, before: Heads, after: Heads): Op.Any[] => {
  if (A.equals(before, after)) {
    return [];
  }
  return patchesToOps(A.diff(doc, before, after), A.equals(after, A.getHeads(doc)) ? doc : A.view(doc, after));
};
