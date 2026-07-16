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
 * a full snapshot append; the existing index collapse-by-id does the rest.
 *
 * Concurrent writers (two tabs/processes holding a live proxy for the same id) are last-*flush*-wins
 * at whole-object granularity: whichever write's block the local index observes last overwrites the
 * other in full, including fields the winner never touched. This is stronger than typical per-field
 * last-write-wins and is a known limitation — precise resolution needs a real merge protocol or
 * positions in the `insertIntoFeed` response (TODO(wittjosiah), out of scope for now).
 *
 * The above convergence relies on `KEY_QUEUE_POSITION` metadata (`assignQueuePositions`) to tell a
 * genuine newer remote write apart from a stale pre-echo poll read while a local write is still
 * outstanding. Positions default to *off*: without them, a concurrent remote write that lands while
 * this core has an outstanding write is conservatively ignored rather than risk clobbering our own
 * not-yet-echoed state — but if that remote write already overwrote the exact state we were waiting
 * to see echoed, our own outstanding entry can never match again, and this core's local view then
 * silently diverges from the feed until the next genuinely-newer *positioned* write arrives (or the
 * object is re-touched). Enabling positions closes this gap; it is not yet the default.
 */
export class FeedObjectCore {
  readonly entity: Entity.Unknown;

  #dirty = false;
  #deleted = false;
  #applyingRemote = false;
  #unsubscribe: (() => void) | undefined;

  /**
   * Canonical (position-stripped) JSON of the entity's current state, as of the last capture or
   * applied remote update. Used to short-circuit reconciliation when an inbound read carries no new
   * information (e.g. a repeated poll), so unchanged objects never fire a reactive notification.
   */
  #lastKnownCanonical: string;

  /**
   * Canonical JSON of writes captured for append but not yet confirmed by an inbound read that
   * matches them. A list, not a single slot: the background flush scheduler fires far faster than
   * the ~1s echo-confirmation poll cycle, so an object can flush more than once before its first
   * flush is even observed coming back through the feed.
   */
  #outstanding: string[] = [];

  constructor(entity: Entity.Unknown, onDirty: (core: FeedObjectCore) => void) {
    this.entity = entity;
    this.#lastKnownCanonical = canonicalJsonOf(Entity.toJSON(entity) as Record<string, unknown>);
    this.#unsubscribe = Entity.subscribe(entity, () => {
      if (this.#applyingRemote || this.#deleted) {
        return;
      }
      this.#dirty = true;
      onDirty(this);
    });
  }

  get dirty(): boolean {
    return this.#dirty;
  }

  get hasOutstandingWrites(): boolean {
    return this.#outstanding.length > 0;
  }

  /**
   * Capture the entity's current state for an append, marking it clean. The caller (`FeedHandle`'s
   * flush) calls this exactly once per dirty core per flush cycle, coalescing any number of
   * synchronous `Obj.update`s since the last flush into a single feed block. Returns the JSON to
   * send plus a token identifying this specific write, for {@link revertCapture} if the append fails.
   */
  captureForAppend(): { json: Record<string, unknown>; token: string } {
    const json = Entity.toJSON(this.entity) as Record<string, unknown>;
    const canonical = canonicalJsonOf(json);
    this.#outstanding.push(canonical);
    this.#lastKnownCanonical = canonical;
    this.#dirty = false;
    return { json, token: canonical };
  }

  /**
   * Revert a specific just-captured write back to dirty after its append RPC failed, so it's
   * retried. Removes only the entry identified by `token` (not simply the most recent one) — several
   * writes for this core may be outstanding concurrently, and only one of them failed.
   */
  revertCapture(token: string): void {
    const index = this.#outstanding.lastIndexOf(token);
    if (index >= 0) {
      this.#outstanding.splice(index, 1);
    }
    this.#dirty = true;
  }

  /**
   * Reconcile an inbound decode of this object's latest feed state (from polling or a query)
   * against local state: apply it, ignore it as stale, or — if a genuine concurrent remote update
   * raced a still-unconfirmed local write — apply it and drop the superseded local write(s).
   */
  reconcile(decoded: Entity.Unknown, inboundJson: Record<string, unknown>): void {
    if (this.#deleted || this.#dirty) {
      // Deleted: ignore remote emissions entirely (re-appending is the only path back to a core).
      // Dirty: local state is strictly newer than anything the server could have echoed back yet.
      return;
    }

    const inboundCanonical = canonicalJsonOf(inboundJson);
    if (inboundCanonical === this.#lastKnownCanonical) {
      // Nothing changed — a repeated poll, or our own write echoed back unchanged.
      const matchIndex = this.#outstanding.indexOf(inboundCanonical);
      if (matchIndex >= 0) {
        this.#outstanding.splice(matchIndex, 1);
      }
      this.#mergeQueuePosition(decoded);
      return;
    }

    if (this.#outstanding.length > 0) {
      const inboundPosition = positionOf(decoded);
      const currentPosition = positionOf(this.entity);
      const isNewerRemoteWrite =
        inboundPosition !== undefined && (currentPosition === undefined || inboundPosition > currentPosition);
      if (!isNewerRemoteWrite) {
        // Stale pre-echo emission of an earlier state; ignore.
        return;
      }
      // A genuine concurrent remote update raced ours. Whole-object LWW: apply it, and drop our
      // still-outstanding writes as superseded (documented data-loss mode — see class doc).
      this.#outstanding = [];
    }

    this.#applyRemote(decoded);
    this.#lastKnownCanonical = inboundCanonical;
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
