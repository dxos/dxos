//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Op from './Op.ts';
import * as Transform from './Transform.ts';

/**
 * One step of a document's history as the worker ordered it. Every subscribed tab receives every
 * entry, including those carrying its own batches, which double as acknowledgements.
 */
export type Entry = {
  readonly version: number;
  readonly ops: readonly Op.Any[];
  /** Automerge heads of the worker's document after this entry. */
  readonly heads: readonly string[];
  /** Set when the entry applies a tab's batch. */
  readonly origin?: Origin;
};

export type Origin = {
  readonly clientId: string;
  readonly batchId: string;
  /**
   * Set when the worker refused this change of the batch, counted from zero: it wrote the changes
   * before it and none after, and the tab sends the later ones again.
   */
  readonly refusedAt?: number;
};

/**
 * Edits a tab sends in one go. `baseVersion` is the last entry the tab had integrated when it made
 * them; the worker transforms the changes over any entries after it.
 */
export type Batch = {
  readonly batchId: string;
  readonly baseVersion: number;
  /** One per `change()` call, in order. */
  readonly changes: readonly Op.Change[];
};

export type ReceiveResult = {
  /** Changes to the tab's visible state, empty for an acknowledgement that matched. */
  readonly patches: Op.Patch[];
  /** Whether the entry acknowledged the in-flight batch. */
  readonly acknowledged: boolean;
  /**
   * Whether the visible state was rebuilt from the confirmed one, which only a worker restart or a
   * refused change that could not be taken back in place causes.
   */
  readonly rebuilt: boolean;
  /**
   * This tab's changes that will never be written, as it made them: one the worker refused, and any
   * that only made sense on top of it. They are no longer visible.
   */
  readonly refused: readonly Op.Change[];
};

/**
 * A tab's view of one document: the state the worker confirmed, at most one batch in flight, and
 * changes made since. The visible state is always confirmed + in-flight + buffered.
 *
 * This is the Jupiter/CodeMirror-collab client: incoming entries from other writers are transformed
 * past the unconfirmed changes, and the unconfirmed changes past them. The worker alone decides
 * whether a change fits: the tab shows the ops of each that fit its view and takes back those ops
 * when the worker refuses the change.
 */
export class ClientState<T = unknown> {
  #confirmed: T;
  #current: T;
  #version: number;
  #heads: readonly string[];
  /** Keeps changes that other writers emptied, since the worker's `refusedAt` counts them. */
  #inflight: Batch | undefined = undefined;
  /** Changes made since the in-flight batch, none of them empty. */
  #buffer: Op.Change[] = [];

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

  /** What readers see: confirmed state plus every unconfirmed change. */
  get current(): T {
    return this.#current;
  }

  get confirmed(): T {
    return this.#confirmed;
  }

  get version(): number {
    return this.#version;
  }

  /** Heads of the last confirmed entry; they do not move for unconfirmed changes. */
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
  get pendingOps(): Op.Any[] {
    return [...(this.#inflight?.changes ?? []), ...this.#buffer].flat();
  }

  /** Records one change made against {@link current}. */
  applyLocal(ops: readonly Op.Any[]): Op.Patch[] {
    if (ops.length === 0) {
      return [];
    }
    const { root, patches } = Op.apply(this.#current, ops);
    this.#current = root;
    this.#buffer.push(ops.slice());
    return patches;
  }

  /** Moves buffered changes into flight; undefined while a batch is already in flight or nothing is buffered. */
  takeBatch(batchId: string): Batch | undefined {
    if (this.#inflight || this.#buffer.length === 0) {
      return undefined;
    }
    this.#inflight = { batchId, baseVersion: this.#version, changes: this.#buffer };
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
      return this.#acknowledge(inflight, entry, entry.origin.refusedAt);
    }

    let incoming: Op.Any[] = entry.ops.slice();
    if (inflight) {
      const [rebased, past] = Transform.changes(inflight.changes, incoming, false);
      this.#inflight = { ...inflight, changes: rebased };
      incoming = past;
    }
    if (this.#buffer.length > 0) {
      const [rebased, past] = Transform.changes(this.#buffer, incoming, false);
      // A change emptied here edited inside a value another writer removed, which Automerge loses too.
      this.#buffer = rebased.filter((change) => change.length > 0);
      incoming = past;
    }
    this.#confirmed = Op.apply(this.#confirmed, entry.ops).root;
    const { root, patches } = Op.apply(this.#current, incoming);
    this.#current = root;
    this.#version = entry.version;
    this.#heads = entry.heads;
    return { patches, acknowledged: false, rebuilt: false, refused: [] };
  }

  /**
   * Adopts a fresh snapshot after the worker lost the history this tab was confirmed against.
   * Unconfirmed changes are replayed on top as a best effort and sent again, except those of the
   * in-flight batch the snapshot already contains: all of them when `applied`, or those before
   * `refusedAt` when the worker refused one.
   */
  reset(
    snapshot: T,
    version: number,
    heads: readonly string[],
    applied = false,
    refusedAt?: number,
  ): { patches: Op.Patch[]; refused: Op.Change[] } {
    const inflight = this.#inflight;
    let pending: readonly Op.Change[] = [...(inflight?.changes ?? []), ...this.#buffer];
    let refused: Op.Change[] = [];
    if (inflight && applied) {
      if (refusedAt === undefined || refusedAt >= inflight.changes.length) {
        pending = this.#buffer;
      } else {
        const base = Op.apply(this.#confirmed, inflight.changes.slice(0, refusedAt).flat()).root;
        ({ rebased: pending, refused } = takeBack(base, inflight.changes, refusedAt, this.#buffer));
      }
    }
    this.#confirmed = snapshot;
    this.#version = version;
    this.#heads = heads;
    this.#inflight = undefined;
    this.#buffer = pending.filter((change) => change.length > 0);
    this.#current = Op.apply(snapshot, this.#buffer.flat()).root;
    return { patches: [{ action: 'put', path: [], value: this.#current }], refused };
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
  ): { patches: Op.Patch[]; rebuilt: boolean; refused: Op.Change[] } {
    const patches: Op.Patch[] = [];
    const refused: Op.Change[] = [];
    let rebuilt = false;
    for (const entry of entries) {
      const result = this.receive({ ...entry, version: this.#version + 1 });
      patches.push(...result.patches);
      refused.push(...result.refused);
      rebuilt ||= result.rebuilt;
    }
    this.#version = version;
    this.#heads = heads;
    this.requeue();
    return { patches, rebuilt, refused };
  }

  /** Returns the in-flight batch to the buffer, once the worker has settled that it did not apply it. */
  requeue(): void {
    if (this.#inflight) {
      this.#buffer = [...this.#inflight.changes.filter((change) => change.length > 0), ...this.#buffer];
      this.#inflight = undefined;
    }
  }

  /** Settles the in-flight batch with the entry that applied it, or the part of it before `refusedAt`. */
  #acknowledge(inflight: Batch, entry: Entry, refusedAt = inflight.changes.length): ReceiveResult {
    const expected = Op.apply(this.#confirmed, inflight.changes.slice(0, refusedAt).flat()).root;
    this.#confirmed = Op.apply(this.#confirmed, entry.ops).root;
    this.#version = entry.version;
    this.#heads = entry.heads;
    this.#inflight = undefined;
    let refused: Op.Change[] = [];
    let undo: Op.Any[] | undefined;
    if (refusedAt < inflight.changes.length) {
      let rebased: Op.Any[][];
      ({ rebased, undo, refused } = takeBack(expected, inflight.changes, refusedAt, this.#buffer));
      this.#buffer = rebased.filter((change) => change.length > 0);
    }
    const replayed = (): T => Op.apply(this.#confirmed, this.#buffer.flat()).root;
    if (Op.equals(expected, this.#confirmed)) {
      if (!undo) {
        return { patches: [], acknowledged: true, rebuilt: false, refused };
      }
      // Taking the change back in place gives readers precise patches, when it reaches the same state.
      const inPlace = Op.apply(this.#current, undo);
      if (Op.equals(inPlace.root, replayed())) {
        this.#current = inPlace.root;
        return { patches: inPlace.patches, acknowledged: true, rebuilt: false, refused };
      }
    }
    this.#current = replayed();
    return { patches: [{ action: 'put', path: [], value: this.#current }], acknowledged: true, rebuilt: true, refused };
  }
}

/**
 * Takes back the change at `refusedAt` of an in-flight batch: the batch's later changes and the
 * buffered ones are rebased as if it had never been made. `base` is the state it applies to.
 * Returns the rebased changes, the ops that take the visible state from before to after, and the
 * refused change with any change that came out empty because it only made sense on top of it.
 */
const takeBack = (
  base: unknown,
  changes: readonly Op.Change[],
  refusedAt: number,
  buffer: readonly Op.Change[],
): { rebased: Op.Any[][]; undo: Op.Any[]; refused: Op.Change[] } => {
  const following = [...changes.slice(refusedAt + 1), ...buffer];
  const [rebased, undo] = Transform.changes(following, Op.invert(base, changes[refusedAt]), false, 'later-wins');
  const lost = following.filter((change, index) => change.length > 0 && rebased[index].length === 0);
  return { rebased, undo, refused: [changes[refusedAt], ...lost] };
};

/**
 * The worker's order for one document: a window of recent entries, so a batch based on an older
 * version can be transformed over the entries its tab had not seen when it made it.
 */
export class Sequencer {
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
   * Transforms a batch's changes so they apply to the current state, or returns undefined when its
   * base is older than the retained window and the tab must resynchronize. A change keeps its place
   * even when it comes out empty, so `refusedAt` counts the changes as the tab made them.
   */
  rebase(batch: Batch): Op.Any[][] | undefined {
    if (batch.baseVersion > this.#version || batch.baseVersion < this.oldestBase) {
      return undefined;
    }
    let changes: Op.Any[][] = batch.changes.map((change) => change.slice());
    for (const entry of this.#entries) {
      if (entry.version > batch.baseVersion) {
        [changes] = Transform.changes(changes, entry.ops, false);
      }
    }
    return changes;
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
