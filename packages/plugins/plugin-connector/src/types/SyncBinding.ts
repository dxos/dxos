//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Database, DXN, Feed, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { invariant } from '@dxos/invariant';
import { Stage } from '@dxos/pipeline';
import { Tagging, type TagIndex } from '@dxos/schema';
import { Cursor } from '@dxos/types';

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
export class SyncBinding extends Type.makeRelation<SyncBinding>(DXN.make('org.dxos.type.syncBinding', '0.2.0'))({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** Remote foreign id (board id, calendar id, channel id, …). */
    remoteId: Schema.String.pipe(Schema.optional),
    /** Cached display label for the remote target. */
    name: Schema.String.pipe(Schema.optional),
    /**
     * Durable progress cursor for this sync — the resume position (`value`) plus last-run status
     * (`lastRunAt`/`lastError`). A standalone {@link Cursor} object (not a sync-specific concept),
     * materialized as a child at creation. Superseded the inline `cursor`/`lastSyncAt`/`lastError`
     * fields in 0.2.0.
     */
    cursor: Ref.Ref(Cursor.Cursor),
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

/**
 * Creates a `SyncBinding` relation linking a {@link Connection} to its synced local root, with a
 * fresh {@link Cursor} materialized as a child (cascade-deleted with the binding). The cursor is
 * constructed here so callers never build one; pass `cursor` to initialize its fields (`value`,
 * `lastRunAt`, `lastError`) — e.g. to seed sync state.
 */
export const make = ({
  cursor: cursorProps,
  ...props
}: Omit<Relation.MakeProps<typeof SyncBinding>, 'cursor'> & { cursor?: Obj.MakeProps<typeof Cursor.Cursor> }) => {
  const cursor = Cursor.make(cursorProps);
  const binding = Relation.make(SyncBinding, { ...props, cursor: Ref.make(cursor) });
  // The cursor is owned by the binding: parenting cascade-deletes it with the binding, and persists it
  // transitively when the binding is added.
  Relation.setParent(cursor, binding);
  return binding;
};

/**
 * The pre-0.2.0 `SyncBinding` shape: cursor + run status were inline string fields rather than a
 * {@link Cursor} object reference. Retained only as the `from` schema for the 0.1.0 → 0.2.0 migration
 * (see `capabilities/migrations.ts`); not used to create new bindings.
 */
export class SyncBindingV1 extends Type.makeRelation<SyncBindingV1>(DXN.make('org.dxos.type.syncBinding', '0.1.0'))({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    remoteId: Schema.String.pipe(Schema.optional),
    name: Schema.String.pipe(Schema.optional),
    cursor: Schema.String.pipe(Schema.optional),
    lastSyncAt: Format.DateTime.pipe(Schema.optional),
    lastError: Schema.String.pipe(Schema.optional),
    snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

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
  /** The binding being synced. */
  readonly binding: SyncBinding;
  /** The binding's cursor object, advanced as pages commit (resolved from `binding.cursor`). */
  readonly cursor: Cursor.Cursor;
  /** Feed the mapped messages are appended to; absent for DB-target syncs (e.g. contacts upsert). */
  readonly feed?: Feed.Feed;
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
  /** Serializes the advanced cursor key for storage on the binding. */
  readonly formatCursor: (key: number) => string;
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

/**
 * Dependencies supplied by the caller; the Layer seeds `dedupSet` / `createdContactEmails` and
 * defaults `formatCursor` to the decimal high-water key.
 */
export type LayerOptions = Omit<State, 'cursor' | 'dedupSet' | 'createdContactEmails' | 'formatCursor'> & {
  readonly formatCursor?: (key: number) => string;
};

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
      const { feed } = options;
      // A binding always has its cursor (materialized at creation); a missing one is a defect.
      const cursor = yield* Database.load(options.binding.cursor).pipe(Effect.orDie);
      // DB-target syncs (no feed) rely on the cursor + idempotent write for dedup; there is no feed to seed.
      const dedupSet = feed ? yield* seedDedupSet(feed, options.foreignKeySource) : new Set<string>();
      return {
        ...options,
        cursor,
        formatCursor: options.formatCursor ?? Cursor.formatKey,
        dedupSet,
        createdContactEmails: new Set<string>(),
      };
    }),
  );

/**
 * Advances the cursor to `maxKey` and stamps the run status. Called from the write commit so the
 * write and the cursor advance land together — the seam the single-transaction TODO below wraps.
 *
 * TODO(wittjosiah): Make the page write and this cursor advance atomic. Today they are separate
 *   stores (feed queue / space-db for {@link commit}, or two space-db mutations for
 *   {@link upsertCommit}) flushed together but not transactionally, so a crash between them can
 *   re-land a page (idempotency + the {@link layer} dedup set cover this until then). Once ECHO can
 *   commit the write and the cursor together, wrap both here and drop the dedup set.
 */
const advanceCursor = (state: State, maxKey: number): void => Cursor.advance(state.cursor, state.formatCursor(maxKey));

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
    const feed = state.feed;
    invariant(feed, 'SyncBinding.commit requires a feed target');
    const { db } = yield* Database.Service;
    yield* Effect.promise(async () => {
      await db.appendToFeed(
        feed,
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
      // Advance the cursor + run status in the same commit as the writes. (A run with no new messages
      // produces no commit, so `lastSyncAt` reflects the last page that landed rather than the last
      // attempt — acceptable, and avoids a separate write path.)
      advanceCursor(state, Math.max(...units.map((unit) => unit.key)));
      // Flush so the space-db mutations (tags, contacts, cursor) commit and are indexed, letting the
      // next run's dedup and contact resolution observe them.
      await db.flush({ indexes: true });
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
      state.stats.newMessages += units.length;
    });
  });

/** An item written by {@link upsertCommit}: an object to upsert into the space plus its cursor key. */
export type UpsertUnit<T> = { readonly item: T; readonly foreignId: string; readonly key: number };

/**
 * Commits a page to a DB target (no feed) via an idempotent upsert. `write` performs the
 * provider-specific find-by-foreign-key → update-or-create and returns whether a new object was
 * created (counted into `stats`). The cursor advance + run status land in the same `Relation.update`
 * as the writes — the same commit-co-located seam as {@link commit}, so the future single-transaction
 * TODO covers both. Idempotent, so a crash before the flush is safe: the next run re-upserts.
 */
export const upsertCommit =
  <T>(write: (item: T) => Effect.Effect<boolean, never, Database.Service>) =>
  (page: Chunk.Chunk<UpsertUnit<T>>): Effect.Effect<void, never, Service | Database.Service> =>
    Effect.gen(function* () {
      const units = Chunk.toReadonlyArray(page);
      if (units.length === 0) {
        return;
      }
      const state = yield* Service;
      const { db } = yield* Database.Service;
      for (const unit of units) {
        if (yield* write(unit.item)) {
          state.stats.newMessages += 1;
        }
      }
      advanceCursor(state, Math.max(...units.map((unit) => unit.key)));
      yield* Effect.promise(() => db.flush({ indexes: true }));
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
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

/** Seeds the dedup set of already-committed foreign ids from the feed (see {@link layer} TODO). */
const seedDedupSet = (feed: Feed.Feed, foreignKeySource: string): Effect.Effect<Set<string>, never, Database.Service> =>
  Feed.query(feed, Filter.everything()).run.pipe(
    Effect.map(
      (items) =>
        new Set(
          items.flatMap((item) =>
            Obj.getMeta(item)
              .keys.filter((key) => key.source === foreignKeySource)
              .map((key) => key.id),
          ),
        ),
    ),
  );
