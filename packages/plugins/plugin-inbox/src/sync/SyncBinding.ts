//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Database, type Feed, Filter, Obj } from '@dxos/echo';
import { Tagging, type TagIndex } from '@dxos/schema';

/**
 * The sync-binding Layer: the shared context a source-sync pipeline runs against. Provided once at
 * the edge (`Effect.provide`), it flows into the reusable stages and the commit sink through the
 * Effect Requirements channel — replacing the old imperative pipeline wrapper. Mutable fields
 * (`dedupSet`, `createdContactEmails`, `stats`) accumulate across the run; a caller that needs the
 * result (e.g. `stats.newMessages`) constructs those objects and reads them back after the run.
 */
export type State = {
  readonly db: Database.Database;
  /** Feed the mapped messages are appended to. */
  readonly feed: Feed.Feed;
  /** Tag index provider-label tags are applied against (feed items are immutable). Absent for
   * providers that don't tag (e.g. calendar events). */
  readonly tagIndex?: TagIndex.TagIndex;
  /** Foreign-key source stamped on synced messages (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly cursorKey: number;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /** Contact emails created earlier in this run, to dedup repeats before the first commit. */
  readonly createdContactEmails: Set<string>;
  /** Persists the advanced cursor key onto the binding (e.g. via `Relation.update`). */
  readonly persistCursorKey: (key: number) => void;
  /** Mutable run tally, read back by the caller after the run. */
  readonly stats: Stats;
};

export type Stats = { newMessages: number };

/** Terminal unit produced by the pipeline for one source item: everything the commit needs to write. */
export type CommitUnit = {
  /** The mapped ECHO message to append to the feed. */
  readonly message: Obj.Any;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly foreignId: string;
  /** Monotonic provider key (Gmail: `internalDate` epoch-ms) used to advance the cursor. */
  readonly key: number;
  /** Tag URIs to apply to the message after it is appended (provider labels/folders). */
  readonly tagUris: readonly string[];
  /** Objects extracted from the message (e.g. contacts) that the commit should `db.add`. */
  readonly extractedObjects: readonly Obj.Any[];
};

/** Effect Requirements tag carrying the {@link State}. */
export class Service extends Context.Tag('@dxos/plugin-inbox/SyncBinding')<Service, State>() {}

/** Dependencies supplied by the caller; the layer seeds `dedupSet` and `createdContactEmails`. */
export type LayerOptions = Omit<State, 'dedupSet' | 'createdContactEmails'>;

/**
 * Builds the sync-binding layer, seeding the committed-id dedup set from the feed.
 *
 * TODO(wittjosiah): The dedup set is a full-feed read that closes the append→advance crash window (a
 * page can land in the feed before its cursor advance persists, since queue and space-db are separate
 * stores with no shared transaction). Evolve in two steps: (1) a bounded newest-N tail read once the
 * queue supports reverse reads — only the last in-flight page can be un-cursored; then (2) drop it
 * entirely once feed + cursor writes can commit transactionally.
 */
export const layer = (options: LayerOptions): Layer.Layer<Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const dedupSet = yield* Effect.promise(() => seedDedupSet(options.db, options.feed, options.foreignKeySource));
      return { ...options, dedupSet, createdContactEmails: new Set<string>() };
    }),
  );

/**
 * Commits one page of pipeline output — the single place non-idempotent writes happen. Use as the
 * {@link Pipeline.run} sink after `Stream.grouped(pageSize)` (which also emits the trailing partial
 * page, so no separate flush is needed).
 *
 * Order matters for crash recovery: the feed append (a queue write) commits first, then the space-db
 * mutations (tags, contacts, cursor advance) commit together in one `flush`. The queue and the space
 * document are separate stores with no shared transaction, so a crash between the two leaves the page
 * in the feed with the cursor un-advanced — the next run re-fetches it and the feed-seeded dedup set
 * drops it. Advancing the cursor before the append would instead lose messages.
 */
export const commit = (page: Chunk.Chunk<CommitUnit>): Effect.Effect<void, never, Service> =>
  Effect.gen(function* () {
    const units = Chunk.toReadonlyArray(page);
    if (units.length === 0) {
      return;
    }
    const state = yield* Service;
    yield* Effect.promise(async () => {
      await state.db.appendToFeed(
        state.feed,
        units.map((unit) => unit.message),
      );
      for (const unit of units) {
        if (state.tagIndex) {
          for (const uri of unit.tagUris) {
            Tagging.set(unit.message, uri, { index: state.tagIndex });
          }
        }
        for (const object of unit.extractedObjects) {
          state.db.add(object);
        }
      }
      state.persistCursorKey(Math.max(...units.map((unit) => unit.key)));
      // Flush so the space-db mutations (tags, contacts, cursor) commit and are indexed, letting the
      // next run's dedup and contact resolution observe them.
      await state.db.flush({ indexes: true });
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
      state.stats.newMessages += units.length;
    });
  });

/** Seeds the dedup set of already-committed foreign ids from the feed (see {@link layer} TODO). */
const seedDedupSet = async (db: Database.Database, feed: Feed.Feed, foreignKeySource: string): Promise<Set<string>> => {
  const items = await db.queryFeed(feed, Filter.everything()).run();
  return new Set(
    items.flatMap((item) =>
      Obj.getMeta(item)
        .keys.filter((key) => key.source === foreignKeySource)
        .map((key) => key.id),
    ),
  );
};
