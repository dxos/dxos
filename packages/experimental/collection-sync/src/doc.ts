//
// Copyright 2026 DXOS.org
//

export type DocId = string;
export type ChangeHash = string;

/** Sorted hashes of the changes no other change depends on. */
export type Heads = readonly ChangeHash[];

export type Change = {
  readonly hash: ChangeHash;
  readonly deps: readonly ChangeHash[];
};

/** Approximate wire size of a change: hash, deps and an opaque payload. */
export const CHANGE_BYTES = 32 + 64;
export const HASH_BYTES = 32;

export const headsEqual = (left: Heads, right: Heads): boolean =>
  left.length === right.length && left.every((hash, index) => hash === right[index]);

/**
 * Minimal stand-in for an Automerge document: a grow-only DAG of changes whose frontier is the heads.
 */
export class DocState {
  /** Insertion order is causal order, since a change is only inserted once its deps are. */
  readonly #changes = new Map<ChangeHash, Change>();
  readonly #heads = new Set<ChangeHash>();
  /** Received changes whose deps have not arrived yet. */
  readonly #pending = new Map<ChangeHash, Change>();

  constructor(readonly id: DocId) {}

  get heads(): Heads {
    return [...this.#heads].sort();
  }

  get size(): number {
    return this.#changes.size;
  }

  get pendingCount(): number {
    return this.#pending.size;
  }

  has(hash: ChangeHash): boolean {
    return this.#changes.has(hash);
  }

  covers(heads: Heads): boolean {
    return heads.every((hash) => this.#changes.has(hash));
  }

  /** Appends a local change on top of the current heads. */
  change(hash: ChangeHash): Change {
    const change: Change = { hash, deps: this.heads };
    this.#insert(change);
    return change;
  }

  /** Applies changes in any order, buffering those whose deps are missing. */
  apply(changes: Iterable<Change>): { applied: number; duplicate: number } {
    let applied = 0;
    let duplicate = 0;
    for (const change of changes) {
      if (this.#changes.has(change.hash) || this.#pending.has(change.hash)) {
        duplicate++;
      } else {
        this.#pending.set(change.hash, change);
      }
    }
    let progress = true;
    while (progress) {
      progress = false;
      for (const [hash, change] of this.#pending) {
        if (change.deps.every((dep) => this.#changes.has(dep))) {
          this.#pending.delete(hash);
          this.#insert(change);
          applied++;
          progress = true;
        }
      }
    }
    return { applied, duplicate };
  }

  /** Hashes of changes that are not ancestors of `heads` (our side of a divergence). */
  changesSince(heads: Heads): ChangeHash[] {
    return this.missingFor(heads).map((change) => change.hash);
  }

  /**
   * Changes a holder of `remoteHeads` lacks, in causal order.
   * Heads we do not know tell us nothing, so a remote that diverged also sends `have` (the hashes it holds beyond
   * what we share); without it we assume the remote has only the ancestors of the heads we recognize.
   */
  missingFor(remoteHeads: Heads, have: readonly ChangeHash[] = []): Change[] {
    const known = new Set<ChangeHash>();
    const stack = remoteHeads.filter((hash) => this.#changes.has(hash));
    for (let hash = stack.pop(); hash !== undefined; hash = stack.pop()) {
      const change = this.#changes.get(hash);
      if (change && !known.has(hash)) {
        known.add(hash);
        stack.push(...change.deps);
      }
    }
    const held = new Set(have);
    return [...this.#changes.values()].filter((change) => !known.has(change.hash) && !held.has(change.hash));
  }

  #insert(change: Change): void {
    this.#changes.set(change.hash, change);
    for (const dep of change.deps) {
      this.#heads.delete(dep);
    }
    this.#heads.add(change.hash);
  }

  clone(): DocState {
    const copy = new DocState(this.id);
    copy.apply(this.#changes.values());
    return copy;
  }
}
