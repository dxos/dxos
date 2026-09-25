//
// Copyright 2026 DXOS.org
//

import type { Patch } from '@automerge/automerge';

import { Op } from '@dxos/automerge-proxy';

import { type ChangeEvent } from '../automerge/client-handle.ts';
import { type MirrorDocHandle } from './mirror-doc-handle.ts';

export type CursorService = {
  /** Positions of Automerge cursors in the text at `path`, both as of `heads`. */
  resolve: (path: Op.Path, heads: string[], cursors: string[]) => Promise<(number | null)[]>;
  /** Automerge cursors for positions in the text at `path`, both as of `heads`. */
  create: (path: Op.Path, heads: string[], positions: number[]) => Promise<(string | null)[]>;
};

/**
 * Automerge cursors over one mirrored text, readable synchronously.
 *
 * The worker resolves each cursor once, against the tab's confirmed heads; from then on the tab moves
 * the position through its own unconfirmed edits and every later change, as CodeMirror maps
 * positions through transactions. Comments, anchors and remote presence read positions here. The
 * text's path follows list edits above it; a cursor whose text was removed or replaced reads
 * undefined until tracked again.
 */
export class MirrorCursors {
  readonly #positions = new Map<string, number | null>();
  #path: Op.Path | null;
  readonly #onChange = ({ patches }: ChangeEvent<unknown>) => {
    const { path, map } = followPatches(this.#path, patches);
    this.#path = path;
    for (const [cursor, position] of this.#positions) {
      this.#positions.set(cursor, position === null ? null : map(position));
    }
  };

  constructor(
    private readonly _handle: MirrorDocHandle<unknown>,
    path: Op.Path,
    private readonly _service: CursorService,
  ) {
    this.#path = path;
    this._handle.on('change', this.#onChange);
  }

  dispose(): void {
    this._handle.off('change', this.#onChange);
  }

  /** Current position of a tracked cursor; undefined until {@link track} resolved it or after its text was replaced. */
  position(cursor: string): number | undefined {
    return this.#positions.get(cursor) ?? undefined;
  }

  /** Starts tracking cursors; positions are readable once this resolves. */
  async track(cursors: string[]): Promise<void> {
    const path = this.#path;
    if (!path) {
      cursors.forEach((cursor) => this.#positions.set(cursor, null));
      return;
    }
    const heads = this._handle.heads;
    const pending = this._handle.pendingOps;
    const later: Patch[][] = [];
    const record = ({ patches }: ChangeEvent<unknown>) => later.push(patches);
    this._handle.on('change', record);
    try {
      // The worker answers in the confirmed text, whose path is the one before unconfirmed edits moved it.
      const confirmedPath = unfollowOps(path, pending);
      const positions = confirmedPath
        ? await this._service.resolve(confirmedPath, heads, cursors)
        : cursors.map(() => null);
      cursors.forEach((cursor, index) => {
        const confirmed = positions[index];
        if (!confirmedPath || confirmed === null || confirmed === undefined) {
          this.#positions.set(cursor, null);
          return;
        }
        const { map } = followOps(confirmedPath, pending);
        let position: number | null = map(confirmed);
        let current: Op.Path | null = path;
        for (const patches of later) {
          const followed = followPatches(current, patches);
          current = followed.path;
          position = position === null ? null : followed.map(position);
        }
        this.#positions.set(cursor, position);
      });
    } finally {
      this._handle.off('change', record);
    }
  }

  /**
   * Cursors for positions in the tab's current text. A position inside text the worker has not
   * confirmed has no Automerge character yet, so creation waits for the confirmation, moving the
   * requested positions through whatever arrives meanwhile.
   */
  async create(positions: number[]): Promise<(string | null)[]> {
    let requested: (number | null)[] = [...positions];
    for (;;) {
      const path = this.#path;
      const pending = this._handle.pendingOps;
      const confirmedPath = path ? unfollowOps(path, pending) : null;
      if (!path || !confirmedPath) {
        return positions.map(() => null);
      }
      const confirmed = requested.map((position) =>
        position === null ? null : mapBackThroughOps(position, confirmedPath, pending),
      );
      if (confirmed.every((position) => position !== undefined)) {
        const valid = confirmed.filter((position): position is number => position !== null);
        const cursors = valid.length > 0 ? await this._service.create(confirmedPath, this._handle.heads, valid) : [];
        let next = 0;
        return confirmed.map((position) => (position === null ? null : (cursors[next++] ?? null)));
      }
      const later: Patch[][] = [];
      const record = ({ patches }: ChangeEvent<unknown>) => later.push(patches);
      this._handle.on('change', record);
      try {
        await this._handle.confirmed.waitForCount(1);
      } finally {
        this._handle.off('change', record);
      }
      let current: Op.Path | null = path;
      for (const patches of later) {
        const followed = followPatches(current, patches);
        current = followed.path;
        requested = requested.map((position) => (position === null ? null : followed.map(position)));
      }
    }
  }
}

const samePath = (left: readonly (string | number)[], right: readonly (string | number)[]) =>
  left.length === right.length && left.every((key, index) => String(key) === String(right[index]));

const isPrefix = (prefix: readonly (string | number)[], path: readonly (string | number)[]) =>
  prefix.length <= path.length && prefix.every((key, index) => String(key) === String(path[index]));

/** Moves `path` through inserting `count` elements at `index` of the list at `listPath`. */
const shiftForInsert = (path: Op.Path, listPath: readonly (string | number)[], index: number, count: number) => {
  if (listPath.length >= path.length || !isPrefix(listPath, path)) {
    return path;
  }
  const element = Number(path[listPath.length]);
  return element >= index
    ? [...path.slice(0, listPath.length), element + count, ...path.slice(listPath.length + 1)]
    : path;
};

/** Moves `path` through removing `count` elements at `index` of the list at `listPath`; null if removed. */
const shiftForRemove = (
  path: Op.Path,
  listPath: readonly (string | number)[],
  index: number,
  count: number,
): Op.Path | null => {
  if (listPath.length >= path.length || !isPrefix(listPath, path)) {
    return path;
  }
  const element = Number(path[listPath.length]);
  if (element < index) {
    return path;
  }
  return element < index + count
    ? null
    : [...path.slice(0, listPath.length), element - count, ...path.slice(listPath.length + 1)];
};

type Followed = { path: Op.Path | null; map: (position: number) => number | null };

/**
 * Follows a text through Automerge-shaped patches: its path through list edits above it, and a
 * position through edits to it. Everything maps to null once the text or a container above it is
 * replaced or removed, including the root put of a rebuild.
 */
const followPatches = (start: Op.Path | null, patches: readonly Patch[]): Followed => {
  let path = start;
  const steps: ((position: number) => number)[] = [];
  for (const patch of patches) {
    if (!path) {
      break;
    }
    const parent = patch.path.slice(0, -1);
    const last = patch.path[patch.path.length - 1];
    if (samePath(parent, path) && typeof last === 'number') {
      // An edit of the text itself.
      if (patch.action === 'splice') {
        const length = patch.value.length;
        steps.push((position) => (last <= position ? position + length : position));
      } else if (patch.action === 'del') {
        const length = patch.length ?? 1;
        steps.push((position) => (position >= last + length ? position - length : position >= last ? last : position));
      }
      continue;
    }
    if ((patch.action === 'put' || patch.action === 'del') && isPrefix(patch.path, path)) {
      path = null;
    } else if (patch.action === 'insert') {
      path = shiftForInsert(path, parent, Number(last), patch.values.length);
    } else if (patch.action === 'del' && typeof last === 'number') {
      path = shiftForRemove(path, parent, last, patch.length ?? 1);
    }
  }
  const alive = path !== null;
  return { path, map: (position) => (alive ? steps.reduce((mapped, step) => step(mapped), position) : null) };
};

/** Follows a text from the confirmed state through unconfirmed ops, as {@link followPatches} does. */
const followOps = (start: Op.Path, ops: readonly Op.Any[]): Followed => {
  let path: Op.Path | null = start;
  const steps: ((position: number) => number)[] = [];
  for (const op of ops) {
    if (!path) {
      break;
    }
    if (op.type === 'splice' && samePath(op.path, path)) {
      steps.push((position) =>
        position >= op.index + op.remove
          ? position + op.insert.length - op.remove
          : position >= op.index
            ? op.index
            : position,
      );
      continue;
    }
    const parent = op.path.slice(0, -1);
    const last = Number(op.path[op.path.length - 1]);
    if ((op.type === 'put' || op.type === 'del') && isPrefix(op.path, path)) {
      path = null;
    } else if (op.type === 'insert') {
      path = shiftForInsert(path, parent, last, op.values.length);
    } else if (op.type === 'remove') {
      path = shiftForRemove(path, parent, last, op.count);
    }
  }
  const alive = path !== null;
  return { path, map: (position) => (alive ? steps.reduce((mapped, step) => step(mapped), position) : null) };
};

/** The text's path in the confirmed state, given its path after unconfirmed ops; null if they created it. */
const unfollowOps = (path: Op.Path, ops: readonly Op.Any[]): Op.Path | null => {
  let current: Op.Path | null = path;
  for (const op of [...ops].reverse()) {
    if (!current) {
      break;
    }
    const parent = op.path.slice(0, -1);
    const last = Number(op.path[op.path.length - 1]);
    if (op.type === 'put' && isPrefix(op.path, current)) {
      current = null;
    } else if (op.type === 'insert') {
      // Null when the text sits inside the inserted elements, which the confirmed state lacks.
      current = shiftForRemove(current, parent, last, op.values.length);
    } else if (op.type === 'remove') {
      current = shiftForInsert(current, parent, last, op.count);
    }
  }
  return current;
};

/**
 * Moves a position in the visible text back through unconfirmed ops into the confirmed text, whose
 * path is `confirmedPath`. Undefined when it lies in text only this tab has seen.
 */
const mapBackThroughOps = (position: number, confirmedPath: Op.Path, ops: readonly Op.Any[]): number | undefined => {
  // Each splice is matched against the text's path at the point the op was made.
  const pathAt: (Op.Path | null)[] = [];
  let path: Op.Path | null = confirmedPath;
  for (const op of ops) {
    pathAt.push(path);
    if (path) {
      path = followOps(path, [op]).path;
    }
  }
  let mapped = position;
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index];
    const at = pathAt[index];
    if (op.type !== 'splice' || !at || !samePath(op.path, at) || mapped < op.index) {
      continue;
    }
    if (mapped >= op.index + op.insert.length) {
      mapped = mapped - op.insert.length + op.remove;
    } else {
      return undefined;
    }
  }
  return mapped;
};
