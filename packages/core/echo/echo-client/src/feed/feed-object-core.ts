//
// Copyright 2026 DXOS.org
//

import { Entity } from '@dxos/echo';
import { EchoFeedCodec, type FeedBlockRef } from '@dxos/echo-protocol';
import { type AnyProperties, change, getMetaChecked, setFeedBlockKeys } from '@dxos/echo/internal';
import { FeedProtocol } from '@dxos/protocols';

import { FeedBranchMismatchError } from '../errors.ts';

/** How an inbound block relates to the block a core last applied. */
type BlockOrder = 'same' | 'newer' | 'older' | 'concurrent';

const blockIdOf = (ref: FeedBlockRef): string | undefined =>
  ref.actorId !== undefined && ref.sequence !== undefined
    ? EchoFeedCodec.blockId(ref.actorId, ref.sequence)
    : undefined;

/**
 * Orders two blocks of the same object. A position authority's order wins where both blocks have
 * one; otherwise the feed's sequence, which a writer assigns after every block it holds, orders
 * causally related writes. Blocks nothing orders are taken as newer, since the reader has only what
 * it is sent.
 */
const compareBlocks = (inbound: FeedBlockRef, current: FeedBlockRef | undefined): BlockOrder => {
  if (current === undefined) {
    return 'newer';
  }
  const inboundId = blockIdOf(inbound);
  const currentId = blockIdOf(current);
  if (inboundId !== undefined && currentId !== undefined) {
    if (inboundId === currentId) {
      return 'same';
    }
  } else if (inbound.position !== undefined && inbound.position === current.position) {
    return 'same';
  }
  if (inbound.position !== undefined && current.position !== undefined) {
    return inbound.position > current.position ? 'newer' : 'older';
  }
  if (inbound.sequence !== undefined && current.sequence !== undefined) {
    if (inbound.sequence === current.sequence) {
      return 'concurrent';
    }
    return inbound.sequence > current.sequence ? 'newer' : 'older';
  }
  return 'newer';
};

/** An object's branch as its key states it, `null` on the root; the raw id, so a malformed one matches no branch. */
const branchOf = (entity: Entity.Unknown): string | null =>
  Entity.getKeys(entity, FeedProtocol.KEY_FEED_BRANCH).at(0)?.id ?? null;

/** What reconciling an inbound block would do, decided from its block reference alone. */
type Classification = 'ignore' | 'reposition' | 'apply';

/**
 * Per-object client-side state for a live feed-backed entity: tracks local (`Obj.update`) changes
 * pending background persistence, and reconciles inbound feed re-reads (from polling or a fresh
 * query) against them so a slow-to-echo local write is never clobbered by a stale server read.
 *
 * Persistence is always a whole-object re-append reusing the entity's id — there is no partial-
 * object update block format yet (see `EchoFeedCodec.encode`'s TODO), so every `Obj.update` produces
 * a full snapshot append; the existing index collapse-by-id does the rest. Rapid `Obj.update`s
 * coalesce to a single append (the latest combined state), so only ONE state is ever pending — we
 * never queue intermittent states.
 *
 * Reconciliation compares block references, never content: every object read from a feed carries
 * the id (`<sequence>@<actorId>`) and, once ordered, the position of the block it came from (see
 * `EchoFeedCodec.decodeBlock`). The core keeps the reference of the block its state reflects:
 *
 *   Obj.update → dirty (local, unappended) → in flight → confirmed (the append returned its block id)
 *
 * A re-read of the block already applied costs nothing beyond adopting a new position; a newer block
 * is decoded and applied; an older one is ignored. While a write is in flight its block id is not
 * known yet, so only a block a position authority ordered after the current state overrides it.
 *
 * Concurrent writers (two tabs/processes holding a live proxy for the same id) are last-*flush*-wins
 * at whole-object granularity: whichever write's block orders last overwrites the other in full,
 * including fields the winner never touched. This is stronger than typical per-field last-write-wins
 * and is a known limitation — precise resolution needs a real merge protocol (TODO(wittjosiah), out
 * of scope for now).
 */
export class FeedObjectCore {
  readonly entity: Entity.Unknown;

  #dirty = false;
  #deleted = false;
  #applyingRemote = false;
  #unsubscribe: (() => void) | undefined;

  /** The block the entity's state reflects; `undefined` for an object written here and not yet sent. */
  #applied: FeedBlockRef | undefined;

  /**
   * The capture awaiting its block id: at most one, because appends coalesce to the latest combined
   * state and a later capture replaces it. `confirmed` marks a write whose store reported no block id,
   * which stays pending until an ordered block supersedes it.
   */
  #pending: { token: number; confirmed: boolean } | undefined;

  #nextToken = 0;

  /** The token of the write {@link #applied} names, so a write confirmed out of order cannot step it back. */
  #appliedToken = 0;

  /** A position the entity's state is ordered after, kept when {@link #applied} names a block not yet positioned. */
  #positionFloor: number | undefined;

  /**
   * The branch the object belongs to (`null` for the root), fixed by its first write or by the store; `undefined`
   * until then. A feed accepts an update only on the object's own branch (F-1.3), so no local write may change it.
   */
  #branch: string | null | undefined;

  /**
   * The block a fork the object is the base of starts at, until the store confirms the write that carries it. Kept
   * here rather than on the entity, so a retried write still forks and a later update does not fork again.
   */
  #fork: { at: string; token: number | undefined } | undefined;

  constructor(entity: Entity.Unknown, onDirty: (core: FeedObjectCore) => void) {
    this.entity = entity;
    const ref = EchoFeedCodec.blockOfKeys([
      ...Entity.getKeys(entity, FeedProtocol.KEY_FEED_BLOCK),
      ...Entity.getKeys(entity, FeedProtocol.KEY_QUEUE_POSITION),
    ]);
    this.#applied = blockIdOf(ref) !== undefined || ref.position !== undefined ? ref : undefined;
    this.#branch = this.#applied !== undefined ? branchOf(entity) : undefined;
    this.#unsubscribe = Entity.subscribe(entity, () => {
      if (this.#applyingRemote || this.#deleted) {
        return;
      }
      this.#dirty = true;
      onDirty(this);
    });
  }

  get deleted(): boolean {
    return this.#deleted;
  }

  /** Whether the store holds the entity's current state: nothing left to capture, and no capture awaiting the store. */
  get acknowledged(): boolean {
    return !this.#dirty && (this.#pending === undefined || this.#pending.confirmed);
  }

  /**
   * Capture the entity's current state for an append, marking it clean. The caller (`FeedHandle`'s
   * flush) calls this once per dirty core per flush cycle, coalescing any number of synchronous
   * `Obj.update`s since the last flush into a single feed block. Returns the JSON to send plus a
   * token naming this write, for {@link confirmAppend} or {@link revertCapture}.
   */
  captureForAppend(): { json: Record<string, unknown>; token: number; rejected?: FeedBranchMismatchError } {
    // The background flush has no caller to reject to, so a local edit of the branch keys is undone and reported.
    const rejected = this.checkBranch(this.entity);
    if (rejected) {
      this.restoreBranch();
    }
    this.#branch ??= branchOf(this.entity);
    const entityJson = Entity.toJSON(this.entity) as Record<string, unknown>;
    const token = ++this.#nextToken;
    // Only one write carries the fork, so an edit while it is in flight does not start a second branch.
    const unsentFork = this.#fork?.token === undefined ? this.#fork : undefined;
    const json = unsentFork ? EchoFeedCodec.withForkAt(entityJson, unsentFork.at) : entityJson;
    if (unsentFork) {
      unsentFork.token = token;
    }
    this.#pending = { token, confirmed: false };
    this.#dirty = false;
    return { json, token, rejected };
  }

  /** The id of the block the core reflects; `undefined` until the store reports one. */
  get blockId(): string | undefined {
    return this.#applied === undefined ? undefined : blockIdOf(this.#applied);
  }

  /** The branch of the object; `undefined` on the root branch or before its first write. */
  get branch(): string | undefined {
    return this.#branch ?? undefined;
  }

  /** Whether the object is the base of a fork the store has not yet confirmed, so its branch is not known. */
  get forkPending(): boolean {
    return this.#fork !== undefined;
  }

  /** Whether the write carrying the fork is in flight: a capture now would have no branch and land on the root. */
  get forkInFlight(): boolean {
    return this.#fork?.token !== undefined;
  }

  /** Whether the object was ever written, so it has a branch a fork would move it off. */
  get written(): boolean {
    return this.#applied !== undefined || this.#pending !== undefined;
  }

  /** Makes the next write of the object the base block of a new branch that forks at block `at`. */
  requestFork(at: string): void {
    this.#fork = { at, token: undefined };
  }

  /**
   * The error a write of `candidate` as this object must be rejected with, when it states a different branch or
   * fork point than the object has; `undefined` when it may be written.
   */
  checkBranch(candidate: Entity.Unknown): FeedBranchMismatchError | undefined {
    if (this.#branch === undefined) {
      return undefined;
    }
    const requested = branchOf(candidate);
    if (requested === this.#branch) {
      return undefined;
    }
    return new FeedBranchMismatchError({
      objectId: this.entity.id,
      branch: this.#branch ?? undefined,
      requestedBranch: requested ?? undefined,
    });
  }

  /** Put the object's own branch keys back on the working-set instance after a rejected local edit of them. */
  restoreBranch(): void {
    const branch = this.#branch;
    if (branch === undefined) {
      return;
    }
    this.#applyingRemote = true;
    try {
      change(this.entity, (mutable: Entity.Mutable<Entity.Unknown>) => {
        // In place: the existing key records belong to this array, and ECHO refuses to re-home them.
        const keys = getMetaChecked(mutable as AnyProperties).keys;
        for (let index = keys.length - 1; index >= 0; index--) {
          const source = keys[index].source;
          if (source === FeedProtocol.KEY_FEED_BRANCH) {
            keys.splice(index, 1);
          }
        }
        if (branch !== null) {
          keys.push({ source: FeedProtocol.KEY_FEED_BRANCH, id: branch });
        }
      });
    } finally {
      this.#applyingRemote = false;
    }
  }

  /**
   * Record that a captured write reached the store. With the block id the store reported, the core
   * reflects that block from here on; without one it keeps preferring its state until an ordered
   * block supersedes it. A no-op once a newer capture replaced this one.
   */
  confirmAppend(token: number, blockId: string | undefined, predecessor?: string | null): void {
    const forked = this.#fork?.token === token;
    if (forked) {
      this.#fork = undefined;
      // The base block of a branch names the branch, so the object continues it from here on.
      if (blockId !== undefined) {
        this.#branch = blockId;
        this.restoreBranch();
      }
    }
    if (this.#pending?.token !== token) {
      // A write a newer capture superseded still landed: its block is ours and older than the pending state, so
      // an echo of it must be recognised as such rather than read as a newer block from elsewhere.
      if (blockId !== undefined && this.#pending !== undefined && token > this.#appliedToken) {
        this.#positionFloor = this.#applied?.position ?? this.#positionFloor;
        this.#applied = EchoFeedCodec.blockOfKeys([{ source: FeedProtocol.KEY_FEED_BLOCK, id: blockId }]);
        this.#appliedToken = token;
      }
      return;
    }
    if (blockId === undefined) {
      this.#pending = { token, confirmed: true };
      return;
    }
    this.#pending = undefined;
    this.#applied = EchoFeedCodec.blockOfKeys([{ source: FeedProtocol.KEY_FEED_BLOCK, id: blockId }]);
    this.#appliedToken = token;
    // The store echoes this block as already applied, so the keys it would stamp on a read are stamped here.
    this.#stampBlock(blockId, predecessor ?? undefined, forked);
  }

  /**
   * Revert a just-captured write back to dirty after its append RPC failed, so it's retried. Only
   * clears the pending slot if it still holds this write (a newer capture may have superseded it).
   */
  revertCapture(token: number): void {
    if (this.#fork?.token === token) {
      this.#fork.token = undefined;
    }
    if (this.#pending?.token === token) {
      this.#pending = undefined;
    }
    this.#dirty = true;
  }

  /**
   * Whether an inbound block has to be decoded and passed to {@link reconcile}. A re-read of the
   * block already applied does not: a position it gained is adopted here, from the reference alone.
   */
  accepts(ref: FeedBlockRef): boolean {
    const classification = this.#classify(ref);
    if (classification === 'reposition') {
      this.#setPosition(ref.position);
    }
    return classification === 'apply';
  }

  /**
   * Reconcile a decoded inbound block that {@link accepts} took. Re-classified, since local state can
   * have changed while it was decoding.
   */
  reconcile(decoded: Entity.Unknown, ref: FeedBlockRef): void {
    const classification = this.#classify(ref);
    if (classification === 'reposition') {
      this.#setPosition(ref.position);
    } else if (classification === 'apply') {
      this.#applyingRemote = true;
      try {
        this.#copyFieldsFrom(decoded);
      } finally {
        this.#applyingRemote = false;
      }
      // The store is the authority on which branch it accepted the object on, and the block keys it stamped.
      this.#branch = branchOf(this.entity);
      setFeedBlockKeys(this.entity, undefined);
      this.#applied = ref;
      this.#positionFloor = undefined;
      this.#pending = undefined;
    }
  }

  /** Adopt a position a subscription reported for a block, when it is the block this core reflects. */
  reposition(blockId: string, position: number | null): void {
    if (
      this.#applied !== undefined &&
      blockIdOf(this.#applied) === blockId &&
      (position ?? undefined) !== this.#applied.position
    ) {
      this.#setPosition(position ?? undefined);
    }
  }

  #classify(ref: FeedBlockRef): Classification {
    if (this.#deleted || this.#dirty) {
      // Deleted: ignore remote emissions entirely (re-appending is the only path back to a core).
      // Dirty: a local change hasn't been appended yet, so local state is strictly newer.
      return 'ignore';
    }
    const order = compareBlocks(ref, this.#applied);
    if (order === 'same') {
      // A read never clears a position: index snapshots keep the one a block had when indexed.
      return ref.position !== undefined && ref.position !== this.#applied?.position ? 'reposition' : 'ignore';
    }
    if (this.#pending !== undefined) {
      // Our write orders after every block we hold, so only one an authority placed after the
      // current state can be newer; unordered reads are stale.
      const bound = this.#applied?.position ?? this.#positionFloor;
      const newerPosition = ref.position !== undefined && (bound === undefined || ref.position > bound);
      return newerPosition ? 'apply' : 'ignore';
    }
    return order === 'newer' ? 'apply' : 'ignore';
  }

  /**
   * Stamps the keys the store would stamp on a read of the block it wrote: its id, its predecessor,
   * the fork flag of a base block and the branch. Hidden rather than in `@meta.keys`, so a confirmed
   * write does not notify subscribers a second time.
   */
  #stampBlock(blockId: string, predecessor: string | undefined, fork: boolean): void {
    const branch = this.#branch;
    setFeedBlockKeys(this.entity, [
      { source: FeedProtocol.KEY_FEED_BLOCK, id: blockId },
      ...(branch !== null && branch !== undefined ? [{ source: FeedProtocol.KEY_FEED_BRANCH, id: branch }] : []),
      ...(predecessor !== undefined ? [{ source: FeedProtocol.KEY_FEED_PREV, id: predecessor }] : []),
      ...(predecessor !== undefined && fork ? [{ source: FeedProtocol.KEY_FEED_FORK, id: predecessor }] : []),
    ]);
  }

  #setPosition(position: number | undefined): void {
    this.#applied = { ...this.#applied, position };
    this.#applyingRemote = true;
    try {
      change(this.entity, (mutable: Entity.Mutable<Entity.Unknown>) => {
        // In place: the existing key records belong to this array, and ECHO refuses to re-home them.
        const keys = getMetaChecked(mutable as AnyProperties).keys;
        for (let index = keys.length - 1; index >= 0; index--) {
          if (keys[index].source === FeedProtocol.KEY_QUEUE_POSITION) {
            keys.splice(index, 1);
          }
        }
        if (position !== undefined) {
          keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: String(position) });
        }
      });
    } finally {
      this.#applyingRemote = false;
    }
  }

  /**
   * Apply another entity's state onto this core's working-set instance — used when
   * `FeedHandle.append` is called again with a different object reusing this core's id. The
   * working-set instance (`this.entity`) stays canonical/identity-stable; `source` is the argument
   * passed to `append` and is not retained afterwards. Unlike a remote apply, this is not guarded by
   * `#applyingRemote` — the mutation is genuinely local, so it should mark the core dirty like any
   * other `Obj.update` (the caller immediately captures it for append regardless). The caller checks
   * {@link checkBranch} first, since the source's keys replace the object's wholesale.
   */
  applyLocalUpdate(source: Entity.Unknown): void {
    this.#copyFieldsFrom(source);
  }

  #copyFieldsFrom(source: Entity.Unknown): void {
    change(this.entity, (target: Entity.Mutable<Entity.Unknown>) => {
      // Dynamic keyed access over arbitrary user-data fields: `Entity.Unknown` has no index
      // signature (it's a branded interface), so treating it as a generic record needs a bridge
      // through `unknown` — mirrors `Obj.updateFrom`'s identical cast for the same reason.
      const mutable = target as unknown as Record<string, unknown>;
      const sourceRecord = source as unknown as Record<string, unknown>;
      for (const key of Object.keys(mutable)) {
        if (key !== 'id' && !(key in sourceRecord)) {
          delete mutable[key];
        }
      }
      for (const key of Object.keys(sourceRecord)) {
        if (key === 'id') {
          continue;
        }
        mutable[key] = sourceRecord[key];
      }
      const meta = getMetaChecked(target as AnyProperties);
      const sourceMeta = getMetaChecked(source as AnyProperties);
      meta.keys = sourceMeta.keys;
      meta.tags = sourceMeta.tags;
      meta.annotations = sourceMeta.annotations;
    });
  }

  /**
   * Mark the object deleted: unsubscribe and stop reacting to local changes and remote
   * reconciliation. `Obj.update` on a retained reference still mutates the entity in memory (it
   * remains a valid live proxy) but no longer marks this core dirty or schedules persistence — it
   * must not throw or resurrect the object into the feed. Re-appending after delete registers a
   * fresh core.
   */
  markDeleted(): void {
    this.#deleted = true;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  dispose(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}
