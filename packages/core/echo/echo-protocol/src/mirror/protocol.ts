//
// Copyright 2026 DXOS.org
//

import { InvalidOpError, type MirrorPatch, type Op, applyOps, isContainer } from './ops.ts';
import { transformLists } from './transform.ts';

/**
 * One step of a document's history as the worker ordered it. Every subscribed tab receives every
 * entry, including those carrying its own batches, which double as acknowledgements.
 */
export type Entry = {
  readonly version: number;
  readonly ops: readonly Op[];
  /** Automerge heads of the worker's document after this entry. */
  readonly heads: readonly string[];
  /** Set when the entry applies a tab's batch. */
  readonly origin?: { readonly clientId: string; readonly batchId: string };
};

/**
 * Edits a tab sends in one go. `baseVersion` is the last entry the tab had integrated when it made
 * them; the worker transforms the ops over any entries after it.
 */
export type Batch = {
  readonly batchId: string;
  readonly baseVersion: number;
  readonly ops: readonly Op[];
};

export type ReceiveResult = {
  /** Changes to the tab's visible state, empty for an acknowledgement. */
  readonly patches: MirrorPatch[];
  /** Whether the entry acknowledged the in-flight batch. */
  readonly acknowledged: boolean;
  /**
   * Whether the acknowledged ops differed from what the tab applied optimistically, which only a
   * worker restart can cause; the visible state was then rebuilt from the confirmed one.
   */
  readonly rebuilt: boolean;
};

/**
 * A tab's view of one document: the state the worker confirmed, at most one batch in flight, and
 * edits made since. The visible state is always confirmed + in-flight + buffered.
 *
 * This is the Jupiter/CodeMirror-collab client: incoming entries from other writers are transformed
 * past the unconfirmed edits, and the unconfirmed edits past them.
 */
export class MirrorClientState<T = unknown> {
  #confirmed: T;
  #current: T;
  #version: number;
  #heads: readonly string[];
  #inflight: Batch | undefined = undefined;
  #buffer: Op[] = [];

  constructor(
    readonly clientId: string,
    snapshot: T,
    version: number,
    heads: readonly string[],
  ) {
    this.#confirmed = snapshot;
    this.#current = snapshot;
    this.#version = version;
    this.#heads = heads;
  }

  /** What readers see: confirmed state plus every unconfirmed edit. */
  get current(): T {
    return this.#current;
  }

  get confirmed(): T {
    return this.#confirmed;
  }

  get version(): number {
    return this.#version;
  }

  /** Heads of the last confirmed entry; they do not move for unconfirmed edits. */
  get heads(): readonly string[] {
    return this.#heads;
  }

  get inflight(): Batch | undefined {
    return this.#inflight;
  }

  get hasPending(): boolean {
    return this.#inflight !== undefined || this.#buffer.length > 0;
  }

  /** Every unconfirmed op, in-flight first, relative to the confirmed state. */
  get pendingOps(): Op[] {
    return [...(this.#inflight?.ops ?? []), ...this.#buffer];
  }

  /** Records edits made against {@link current}. */
  applyLocal(ops: readonly Op[]): MirrorPatch[] {
    if (ops.length === 0) {
      return [];
    }
    const { root, patches } = applyOps(this.#current, ops);
    this.#current = root;
    this.#buffer.push(...ops);
    return patches;
  }

  /** Moves buffered edits into flight; undefined while a batch is already in flight or nothing is buffered. */
  takeBatch(batchId: string): Batch | undefined {
    if (this.#inflight || this.#buffer.length === 0) {
      return undefined;
    }
    this.#inflight = { batchId, baseVersion: this.#version, ops: this.#buffer };
    this.#buffer = [];
    return this.#inflight;
  }

  /** Integrates the next entry in the worker's order. */
  receive(entry: Entry): ReceiveResult {
    if (entry.version !== this.#version + 1) {
      throw new Error(`Expected entry ${this.#version + 1}, received ${entry.version}`);
    }
    const inflight = this.#inflight;
    if (inflight && entry.origin?.clientId === this.clientId && entry.origin.batchId === inflight.batchId) {
      const expected = applyOps(this.#confirmed, inflight.ops).root;
      this.#confirmed = applyOps(this.#confirmed, entry.ops).root;
      this.#version = entry.version;
      this.#heads = entry.heads;
      this.#inflight = undefined;
      if (!mirrorEquals(expected, this.#confirmed)) {
        const { root, patches } = applyOps(this.#confirmed, this.#buffer);
        this.#current = root;
        return { patches: [{ action: 'put', path: [], value: root }, ...patches], acknowledged: true, rebuilt: true };
      }
      return { patches: [], acknowledged: true, rebuilt: false };
    }

    let incoming: Op[] = entry.ops.slice();
    if (inflight) {
      const [rebased, past] = transformLists(inflight.ops, incoming, false);
      this.#inflight = { ...inflight, ops: rebased };
      incoming = past;
    }
    if (this.#buffer.length > 0) {
      const [rebased, past] = transformLists(this.#buffer, incoming, false);
      this.#buffer = rebased;
      incoming = past;
    }
    this.#confirmed = applyOps(this.#confirmed, entry.ops).root;
    const { root, patches } = applyOps(this.#current, incoming);
    this.#current = root;
    this.#version = entry.version;
    this.#heads = entry.heads;
    return { patches, acknowledged: false, rebuilt: false };
  }

  /**
   * Adopts a fresh snapshot after the worker lost the history this tab was confirmed against.
   * Unconfirmed edits are replayed on top as a best effort and sent again, except an in-flight batch
   * the snapshot already contains.
   */
  reset(snapshot: T, version: number, heads: readonly string[], inflightApplied = false): MirrorPatch[] {
    const pending = inflightApplied ? this.#buffer : this.pendingOps;
    this.#confirmed = snapshot;
    this.#version = version;
    this.#heads = heads;
    this.#inflight = undefined;
    this.#buffer = pending;
    const { root } = applyOps(snapshot, pending);
    this.#current = root;
    return [{ action: 'put', path: [], value: root }];
  }

  /**
   * Integrates entries a restarted worker rebuilt from history after this tab's confirmed heads,
   * then adopts the new worker's numbering. An in-flight batch that history does not contain goes
   * back to the buffer to be sent again.
   */
  recover(
    entries: readonly Omit<Entry, 'version'>[],
    version: number,
    heads: readonly string[],
  ): { patches: MirrorPatch[]; rebuilt: boolean } {
    const patches: MirrorPatch[] = [];
    let rebuilt = false;
    for (const entry of entries) {
      const result = this.receive({ ...entry, version: this.#version + 1 });
      patches.push(...result.patches);
      rebuilt ||= result.rebuilt;
    }
    this.#version = version;
    this.#heads = heads;
    this.requeue();
    return { patches, rebuilt };
  }

  /**
   * Discards the in-flight batch the worker refused for good. Buffered edits that still apply to the
   * confirmed state are kept; what readers see is rebuilt from them.
   */
  drop(): MirrorPatch[] {
    if (!this.#inflight) {
      return [];
    }
    this.#inflight = undefined;
    let root = this.#confirmed;
    const kept: Op[] = [];
    for (const op of this.#buffer) {
      try {
        root = applyOps(root, [op], { strict: true }).root;
        kept.push(op);
      } catch (err) {
        if (!(err instanceof InvalidOpError)) {
          throw err;
        }
      }
    }
    this.#buffer = kept;
    this.#current = root;
    return [{ action: 'put', path: [], value: root }];
  }

  /** Returns the in-flight batch to the buffer, once the worker has settled that it did not apply it. */
  requeue(): void {
    if (this.#inflight) {
      this.#buffer = [...this.#inflight.ops, ...this.#buffer];
      this.#inflight = undefined;
    }
  }
}

/**
 * The worker's order for one document: a window of recent entries, so a batch based on an older
 * version can be transformed over the entries its tab had not seen when it made it.
 */
export class MirrorSequencer {
  #version: number;
  #entries: Entry[] = [];

  constructor(version = 0) {
    this.#version = version;
  }

  get version(): number {
    return this.#version;
  }

  /** Oldest version a batch can be based on. */
  get oldestBase(): number {
    return this.#entries.length > 0 ? this.#entries[0].version - 1 : this.#version;
  }

  /**
   * Transforms a batch's ops so they apply to the current state, or returns undefined when its base
   * is older than the retained window and the tab must resynchronize.
   */
  rebase(batch: Batch): Op[] | undefined {
    if (batch.baseVersion > this.#version || batch.baseVersion < this.oldestBase) {
      return undefined;
    }
    let ops: Op[] = batch.ops.slice();
    for (const entry of this.#entries) {
      if (entry.version > batch.baseVersion) {
        [ops] = transformLists(ops, entry.ops, false);
      }
    }
    return ops;
  }

  /** Appends the next entry. */
  append(entry: Omit<Entry, 'version'>): Entry {
    const next: Entry = { ...entry, version: this.#version + 1 };
    this.#entries.push(next);
    this.#version = next.version;
    return next;
  }

  /** Entries after `version`, or undefined when some were already trimmed or `version` is not from this numbering. */
  since(version: number): Entry[] | undefined {
    if (version < this.oldestBase || version > this.#version) {
      return undefined;
    }
    return this.#entries.filter((entry) => entry.version > version);
  }

  /** Drops entries every subscriber has integrated. */
  trim(throughVersion: number): void {
    this.#entries = this.#entries.filter((entry) => entry.version > throughVersion);
  }
}

/** Structural equality of two mirror values; leaves such as RawString compare by class and text. */
export const mirrorEquals = (left: unknown, right: unknown): boolean => {
  if (left === right || Object.is(left, right)) {
    return true;
  }
  if (!isContainer(left) || !isContainer(right)) {
    return leafEquals(left, right);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => mirrorEquals(entry, right[index]))
    );
  }
  const entries = Object.entries(left);
  return (
    entries.length === Object.keys(right).length &&
    entries.every(([key, value]) => key in right && mirrorEquals(value, right[key]))
  );
};

const leafEquals = (left: unknown, right: unknown): boolean => {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (left instanceof Uint8Array && right instanceof Uint8Array) {
    return left.length === right.length && left.every((byte, index) => byte === right[index]);
  }
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return Object.getPrototypeOf(left) === Object.getPrototypeOf(right) && String(left) === String(right);
  }
  return false;
};
