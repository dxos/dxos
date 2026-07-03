//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Database, DXN, type Feed, Filter, Obj, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { Stage } from '@dxos/pipeline';
import { Tagging, type TagIndex } from '@dxos/schema';

import * as Connection from './Connection';

/**
 * One synced thing. Source = the {@link Connection} that authenticates the sync;
 * target = the local root object it syncs into (Mailbox, Kanban, Project, …).
 * Carries the per-binding sync state (cursor, timestamps, error) and the
 * last-seen remote snapshots used for three-way merge.
 *
 * Both endpoints must exist before the relation is created, so the local target
 * object is materialized when the binding is created (eager), not lazily on
 * first sync.
 */
export class SyncBinding extends Type.makeRelation<SyncBinding>(DXN.make('org.dxos.type.syncBinding', '0.1.0'))({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** Remote foreign id (board id, calendar id, channel id, …). */
    remoteId: Schema.String.pipe(Schema.optional),
    /** Cached display label for the remote target. */
    name: Schema.String.pipe(Schema.optional),
    /** Provider-defined sync cursor (opaque). */
    cursor: Schema.String.pipe(Schema.optional),
    /** Last successful sync (ISO). */
    lastSyncAt: Format.DateTime.pipe(Schema.optional),
    /** Last sync failure message. */
    lastError: Schema.String.pipe(Schema.optional),
    /**
     * Last-seen remote fields keyed by foreign id (matches `Obj.Meta.keys`).
     * Shape is provider-defined; drives pull merge `(local, remote, snapshot)` — remote wins on conflict.
     */
    snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
    /** Provider-specific options; opaque here — providers validate their shape. */
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

export const instanceOf = (value: unknown): value is SyncBinding => Relation.instanceOf(SyncBinding, value);

/** Creates a `SyncBinding` relation linking a {@link Connection} to its synced local root. */
export const make = (props: Relation.MakeProps<typeof SyncBinding>) => Relation.make(SyncBinding, props);

//
// Sync pipeline.
//
// Shared machinery for running a binding's sync as a `@dxos/pipeline` pipeline: a Layer providing the
// per-run state, and a commit sink that appends a page of output to the target feed. The `db` is
// taken from `Database.Service` in the Requirements channel, so the run's stages/sink and this Layer
// are all provided at the pipeline edge. Provider-specific stages (fetch, decode, map, extract) live
// in the connector plugins.
//

export type Stats = { newMessages: number };

/**
 * Per-run sync state provided to the pipeline stages and the commit sink. Mutable fields (`dedupSet`,
 * `createdContactEmails`, `stats`) accumulate across the run; a caller that needs the result (e.g.
 * `stats.newMessages`) constructs those objects and reads them back after the run.
 */
export type State = {
  /** Feed the mapped messages are appended to. */
  readonly feed: Feed.Feed;
  /** Tag index provider-label tags are applied against; absent for providers that don't tag. */
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

/** Terminal unit produced by the pipeline for one source item: everything the commit needs to write. */
export type CommitUnit = {
  /** The mapped ECHO object to append to the feed. */
  readonly message: Obj.Any;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly foreignId: string;
  /** Monotonic provider key (e.g. `internalDate` / `updated` epoch-ms) used to advance the cursor. */
  readonly key: number;
  /** Tag URIs to apply to the message after it is appended (provider labels/folders). */
  readonly tagUris: readonly string[];
  /** Objects extracted from the message (e.g. contacts) that the commit should `db.add`. */
  readonly extractedObjects: readonly Obj.Any[];
};

/** Effect Requirements tag carrying the per-run {@link State}. */
export class Service extends Context.Tag('@dxos/plugin-connector/SyncBinding')<Service, State>() {}

/** Dependencies supplied by the caller; the Layer seeds `dedupSet` and `createdContactEmails`. */
export type LayerOptions = Omit<State, 'dedupSet' | 'createdContactEmails'>;

/**
 * Builds the sync-binding Layer, seeding the committed-id dedup set from the feed.
 *
 * TODO(wittjosiah): The dedup set is a full-feed read that closes the append→advance crash window (a
 * page can land in the feed before its cursor advance persists, since queue and space-db are separate
 * stores with no shared transaction). Evolve in two steps: (1) a bounded newest-N tail read once the
 * queue supports reverse reads — only the last in-flight page can be un-cursored; then (2) drop it
 * entirely once feed + cursor writes can commit transactionally.
 */
export const layer = (options: LayerOptions): Layer.Layer<Service, never, Database.Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const dedupSet = yield* Effect.promise(() => seedDedupSet(db, options.feed, options.foreignKeySource));
      return { ...options, dedupSet, createdContactEmails: new Set<string>() };
    }),
  );

/**
 * Commits one page of pipeline output — the single place non-idempotent writes happen. Use as the
 * `Pipeline.run` sink after `Stream.grouped(pageSize)` (which also emits the trailing partial page,
 * so no separate flush is needed).
 *
 * Order matters for crash recovery: the feed append (a queue write) commits first, then the space-db
 * mutations (tags, contacts, cursor advance) commit together in one `flush`. The queue and the space
 * document are separate stores with no shared transaction, so a crash between the two leaves the page
 * in the feed with the cursor un-advanced — the next run re-fetches it and the feed-seeded dedup set
 * drops it. Advancing the cursor before the append would instead lose messages.
 */
export const commit = (page: Chunk.Chunk<CommitUnit>): Effect.Effect<void, never, Service | Database.Service> =>
  Effect.gen(function* () {
    const units = Chunk.toReadonlyArray(page);
    if (units.length === 0) {
      return;
    }
    const state = yield* Service;
    const { db } = yield* Database.Service;
    yield* Effect.promise(async () => {
      await db.appendToFeed(
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
          db.add(object);
        }
      }
      state.persistCursorKey(Math.max(...units.map((unit) => unit.key)));
      // Flush so the space-db mutations (tags, contacts, cursor) commit and are indexed, letting the
      // next run's dedup and contact resolution observe them.
      await db.flush({ indexes: true });
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
      state.stats.newMessages += units.length;
    });
  });

/**
 * Reusable dedup stage: drops items already reflected by the cursor — provider key below the run's
 * high-water cursor (`key < cursorKey`) or foreign id already committed (`dedupSet`). Reads the run
 * state from {@link Service}; provider-agnostic via the `getForeignId` / `getKey` accessors.
 */
export const dedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.gen(function* () {
      const { cursorKey, dedupSet } = yield* Service;
      if (getKey(item) < cursorKey || dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      return item;
    }),
  );

export type RunOptions = {
  readonly binding: SyncBinding;
  readonly feed: Feed.Feed;
  readonly tagIndex?: TagIndex.TagIndex;
  readonly foreignKeySource: string;
  /** High-water key at run start (parsed from the binding's cursor by the caller). */
  readonly cursorKey: number;
  /** Serializes the advanced cursor key for storage; defaults to the decimal high-water key. */
  readonly formatCursor?: (key: number) => string;
};

/**
 * Runs a sync pipeline against a binding, internalizing the binding bookkeeping: provides the
 * {@link Service} layer, advances the cursor after each committed page, and on success stamps
 * `lastSyncAt` / clears `lastError`. Returns the run tally.
 */
export const run = <E, R>(
  options: RunOptions,
  pipeline: Effect.Effect<void, E, R>,
): Effect.Effect<{ newMessages: number }, E, Database.Service | Exclude<R, Service>> =>
  Effect.gen(function* () {
    const { binding, formatCursor = (key: number) => String(key) } = options;
    const stats: Stats = { newMessages: 0 };
    yield* pipeline.pipe(
      Effect.provide(
        layer({
          feed: options.feed,
          tagIndex: options.tagIndex,
          foreignKeySource: options.foreignKeySource,
          cursorKey: options.cursorKey,
          persistCursorKey: (key) =>
            Relation.update(binding, (binding) => {
              binding.cursor = formatCursor(key);
            }),
          stats,
        }),
      ),
    );
    Relation.update(binding, (binding) => {
      binding.lastSyncAt = new Date().toISOString();
      binding.lastError = undefined;
    });
    return { newMessages: stats.newMessages };
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
