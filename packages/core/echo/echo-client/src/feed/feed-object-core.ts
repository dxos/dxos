//
// Copyright 2026 DXOS.org
//

import { Entity } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { type AnyProperties, change, getMetaChecked } from '@dxos/echo/internal';
import { FeedProtocol } from '@dxos/protocols';

const canonicalStringify = (value: unknown): string => {
  const sortKeys = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortKeys);
    }
    if (input !== null && typeof input === 'object') {
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(sortKeys(value));
};

const canonicalJsonOf = (json: Record<string, unknown>): string =>
  canonicalStringify(EchoFeedCodec.stripQueuePosition(json));

const positionOf = (entity: Entity.Unknown): number | undefined => {
  const key = Entity.getKeys(entity, FeedProtocol.KEY_QUEUE_POSITION).at(0);
  if (!key) {
    return undefined;
  }
  const position = Number(key.id);
  return Number.isFinite(position) ? position : undefined;
};

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
 * Reconciliation is a small state machine over a single `#state` (the latest known canonical JSON)
 * and a version (`KEY_QUEUE_POSITION`) baseline:
 *
 *   Obj.update → dirty (local, unappended) → appended (awaiting echo) → roundtripped (came back)
 *
 * Before our own append roundtrips we prefer the local state (ignore stale pre-echo reads); once it
 * roundtrips (an inbound block matches what we appended), every later block updates the state,
 * subject to the version being newer.
 *
 * Concurrent writers (two tabs/processes holding a live proxy for the same id) are last-*flush*-wins
 * at whole-object granularity: whichever write's block the local index observes last overwrites the
 * other in full, including fields the winner never touched. This is stronger than typical per-field
 * last-write-wins and is a known limitation — precise resolution needs a real merge protocol
 * (TODO(wittjosiah), out of scope for now).
 *
 * Versioning uses `KEY_QUEUE_POSITION` (`assignQueuePositions`) — the only monotonic block version
 * exposed to the client on both the poll and index read paths. When positions are off, ordering is
 * unavailable: a concurrent remote write racing a not-yet-echoed local write is conservatively
 * ignored (prefer local) until it roundtrips. `insertionId` would be an always-present alternative
 * but is currently stripped before the object JSON reaches the client.
 */
export class FeedObjectCore {
  readonly entity: Entity.Unknown;

  #dirty = false;
  #deleted = false;
  #applyingRemote = false;
  #unsubscribe: (() => void) | undefined;

  /**
   * Canonical (position-stripped) JSON of the entity's current known state — the single source of
   * truth for reconciliation comparisons (updated on capture and on applied remote reads).
   */
  #state: string;

  /**
   * Version (queue position) of the block `#state` reflects, or `undefined` when positions are off
   * or the state hasn't been seen from the feed yet. Baseline for ordering inbound blocks.
   */
  #version: number | undefined;

  /**
   * Canonical JSON of the state captured for append and awaiting its echo (roundtrip). A single
   * slot, not a list: appends coalesce to the latest combined state, so at most one write is in
   * flight; a later capture simply replaces it. `undefined` once roundtripped.
   */
  #pendingAppend: string | undefined;

  constructor(entity: Entity.Unknown, onDirty: (core: FeedObjectCore) => void) {
    this.entity = entity;
    this.#state = canonicalJsonOf(Entity.toJSON(entity) as Record<string, unknown>);
    this.#version = positionOf(entity);
    this.#unsubscribe = Entity.subscribe(entity, () => {
      if (this.#applyingRemote || this.#deleted) {
        return;
      }
      this.#dirty = true;
      onDirty(this);
    });
  }

  /**
   * Capture the entity's current state for an append, marking it clean. The caller (`FeedHandle`'s
   * flush) calls this once per dirty core per flush cycle, coalescing any number of synchronous
   * `Obj.update`s since the last flush into a single feed block. Returns the JSON to send plus a
   * token identifying this write, for {@link revertCapture} if the append fails.
   */
  captureForAppend(): { json: Record<string, unknown>; token: string } {
    const json = Entity.toJSON(this.entity) as Record<string, unknown>;
    const canonical = canonicalJsonOf(json);
    this.#pendingAppend = canonical;
    this.#state = canonical;
    this.#dirty = false;
    return { json, token: canonical };
  }

  /**
   * Revert a just-captured write back to dirty after its append RPC failed, so it's retried. Only
   * clears the pending slot if it still holds this write (a newer capture may have superseded it).
   */
  revertCapture(token: string): void {
    if (this.#pendingAppend === token) {
      this.#pendingAppend = undefined;
    }
    this.#dirty = true;
  }

  /**
   * Reconcile an inbound decode of this object's latest feed state (from polling or a query) against
   * local state per the lifecycle in the class doc: keep local while a change is unappended or a
   * pending append hasn't roundtripped; otherwise adopt newer remote blocks (whole-object LWW).
   */
  reconcile(decoded: Entity.Unknown, inboundJson: Record<string, unknown>): void {
    if (this.#deleted || this.#dirty) {
      // Deleted: ignore remote emissions entirely (re-appending is the only path back to a core).
      // Dirty: a local change hasn't been appended yet, so local state is strictly newer.
      return;
    }

    const inboundCanonical = canonicalJsonOf(inboundJson);
    const inboundPosition = positionOf(decoded);

    if (this.#pendingAppend !== undefined) {
      if (inboundCanonical === this.#pendingAppend) {
        // Our own append roundtripped: adopt its version and stop preferring local.
        this.#pendingAppend = undefined;
        this.#state = inboundCanonical;
        this.#version = inboundPosition ?? this.#version;
        this.#mergeQueuePosition(decoded);
        return;
      }
      // Not our echo. Only a provably-newer remote write overrides our still-unconfirmed append
      // (whole-object LWW). Without positions we can't order, so prefer local — anything else is
      // treated as a stale pre-echo read and ignored.
      if (this.#strictlyNewer(inboundPosition)) {
        this.#pendingAppend = undefined;
        this.#applyRemote(decoded);
        this.#state = inboundCanonical;
        this.#version = inboundPosition;
      }
      return;
    }

    // Clean (no local change, nothing pending).
    if (inboundCanonical === this.#state) {
      // No content change — a repeated poll; keep the position baseline in sync.
      this.#mergeQueuePosition(decoded);
      if (inboundPosition !== undefined) {
        this.#version = inboundPosition;
      }
      return;
    }
    // Differing remote block with nothing local to protect: adopt it unless it's a provably-older
    // (out-of-order) stale read.
    if (!this.#strictlyOlder(inboundPosition)) {
      this.#applyRemote(decoded);
      this.#state = inboundCanonical;
      this.#version = inboundPosition ?? this.#version;
    }
  }

  /** Inbound block is ordered strictly after our current baseline (both positions known). */
  #strictlyNewer(inboundPosition: number | undefined): boolean {
    return inboundPosition !== undefined && (this.#version === undefined || inboundPosition > this.#version);
  }

  /** Inbound block is ordered strictly before our current baseline (both positions known). */
  #strictlyOlder(inboundPosition: number | undefined): boolean {
    return inboundPosition !== undefined && this.#version !== undefined && inboundPosition <= this.#version;
  }

  #mergeQueuePosition(decoded: Entity.Unknown): void {
    const positionKeys = Entity.getKeys(decoded, FeedProtocol.KEY_QUEUE_POSITION);
    if (positionKeys.length === 0) {
      return;
    }
    const currentKeys = Entity.getKeys(this.entity, FeedProtocol.KEY_QUEUE_POSITION);
    if (currentKeys.length === positionKeys.length && currentKeys.every((key, i) => key.id === positionKeys[i].id)) {
      return;
    }
    this.#applyingRemote = true;
    try {
      change(this.entity, (mutable: Entity.Mutable<Entity.Unknown>) => {
        const meta = getMetaChecked(mutable as AnyProperties);
        meta.keys = [...meta.keys.filter((key) => key.source !== FeedProtocol.KEY_QUEUE_POSITION), ...positionKeys];
      });
    } finally {
      this.#applyingRemote = false;
    }
  }

  #applyRemote(decoded: Entity.Unknown): void {
    this.#applyingRemote = true;
    try {
      this.#copyFieldsFrom(decoded);
    } finally {
      this.#applyingRemote = false;
    }
  }

  /**
   * Apply another entity's state onto this core's working-set instance — used when
   * `FeedHandle.append` is called again with a different object reusing this core's id. The
   * working-set instance (`this.entity`) stays canonical/identity-stable; `source` is the argument
   * passed to `append` and is not retained afterwards. Unlike {@link #applyRemote}, this is not
   * guarded by `#applyingRemote` — the mutation is genuinely local, so it should mark the core dirty
   * like any other `Obj.update` (the caller immediately captures it for append regardless).
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
