//
// Copyright 2026 DXOS.org
//

import type { Patch } from '@automerge/automerge';

import { Mirror } from '@dxos/echo-protocol';

import { type ChangeEvent } from '../automerge/client-handle.ts';
import { type MirrorDocHandle } from './mirror-doc-handle.ts';

export type CursorService = {
  /** Positions of Automerge cursors in the text as of `heads`. */
  resolve: (heads: string[], cursors: string[]) => Promise<(number | null)[]>;
  /** Automerge cursors for positions in the text as of `heads`. */
  create: (heads: string[], positions: number[]) => Promise<(string | null)[]>;
};

/**
 * Automerge cursors over one mirrored text, readable synchronously.
 *
 * The worker resolves each cursor once, against the tab's confirmed heads; from then on the tab moves
 * the position through its own unconfirmed edits and every later change, as CodeMirror maps
 * positions through transactions. Comments, anchors and remote presence read positions here.
 */
export class MirrorCursors {
  readonly #positions = new Map<string, number | null>();
  readonly #onChange = ({ patches }: ChangeEvent<unknown>) => {
    for (const [cursor, position] of this.#positions) {
      this.#positions.set(cursor, position === null ? null : mapThroughPatches(position, this._path, patches));
    }
  };

  constructor(
    private readonly _handle: MirrorDocHandle<unknown>,
    private readonly _path: Mirror.Path,
    private readonly _service: CursorService,
  ) {
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
    const heads = this._handle.heads;
    const pending = this._handle.pendingOps;
    const later: Patch[][] = [];
    const record = ({ patches }: ChangeEvent<unknown>) => later.push(patches);
    this._handle.on('change', record);
    try {
      const positions = await this._service.resolve(heads, cursors);
      cursors.forEach((cursor, index) => {
        const confirmed = positions[index];
        if (confirmed === null || confirmed === undefined) {
          this.#positions.set(cursor, null);
          return;
        }
        let position: number | null = mapThroughOps(confirmed, this._path, pending);
        for (const patches of later) {
          position = position === null ? null : mapThroughPatches(position, this._path, patches);
        }
        this.#positions.set(cursor, position);
      });
    } finally {
      this._handle.off('change', record);
    }
  }

  /**
   * Cursors for positions in the tab's current text. A position inside text the worker has not
   * confirmed has no Automerge character yet, so creation waits for the confirmation.
   */
  async create(positions: number[]): Promise<(string | null)[]> {
    for (;;) {
      const pending = this._handle.pendingOps;
      const confirmed = positions.map((position) => mapBackThroughOps(position, this._path, pending));
      if (confirmed.every((position): position is number => position !== undefined)) {
        return this._service.create(this._handle.heads, confirmed);
      }
      await this._handle.confirmed.waitForCount(1);
    }
  }
}

const isTextPosition = (path: readonly (string | number)[], textPath: Mirror.Path) =>
  path.length === textPath.length + 1 && textPath.every((key, index) => String(key) === String(path[index]));

const isTextItself = (path: readonly (string | number)[], textPath: Mirror.Path) =>
  path.length === textPath.length && textPath.every((key, index) => String(key) === String(path[index]));

/** Moves a character position through Automerge-shaped patches; null once the text was replaced. */
const mapThroughPatches = (position: number, textPath: Mirror.Path, patches: readonly Patch[]): number | null => {
  let mapped = position;
  for (const patch of patches) {
    if (isTextItself(patch.path, textPath) && (patch.action === 'put' || patch.action === 'del')) {
      return null;
    }
    if (!isTextPosition(patch.path, textPath)) {
      continue;
    }
    const at = Number(patch.path[patch.path.length - 1]);
    if (patch.action === 'splice' && at <= mapped) {
      mapped += patch.value.length;
    } else if (patch.action === 'del') {
      const length = patch.length ?? 1;
      mapped = mapped >= at + length ? mapped - length : mapped >= at ? at : mapped;
    }
  }
  return mapped;
};

/** Moves a position in the confirmed text through unconfirmed ops, into the visible text. */
const mapThroughOps = (position: number, textPath: Mirror.Path, ops: readonly Mirror.Op[]): number | null => {
  let mapped = position;
  for (const op of ops) {
    if ((op.type === 'put' || op.type === 'del') && isTextItself(op.path, textPath)) {
      return null;
    }
    if (op.type !== 'splice' || !isTextItself(op.path, textPath)) {
      continue;
    }
    if (mapped >= op.index + op.remove) {
      mapped += op.insert.length - op.remove;
    } else if (mapped >= op.index) {
      mapped = op.index;
    }
  }
  return mapped;
};

/**
 * Moves a position in the visible text back through unconfirmed ops into the confirmed text.
 * Undefined when it lies in text only this tab has seen.
 */
const mapBackThroughOps = (position: number, textPath: Mirror.Path, ops: readonly Mirror.Op[]): number | undefined => {
  let mapped = position;
  for (const op of [...ops].reverse()) {
    if (op.type !== 'splice' || !isTextItself(op.path, textPath)) {
      continue;
    }
    if (mapped < op.index) {
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
