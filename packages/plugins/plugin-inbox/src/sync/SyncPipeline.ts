//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Database, type Feed, Filter, Obj } from '@dxos/echo';
import { Pipeline, Stage } from '@dxos/pipeline';
import { type TagIndex } from '@dxos/schema';
import { type Person } from '@dxos/types';

import { commitPage } from './internal/commit';

/**
 * Terminal unit produced by the pipeline for one source item: everything the commit step needs to
 * write. Stages stay pure and accumulate these; {@link run}'s sink batches and commits them.
 */
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

/**
 * Shared context injected into every stage and the sink. Heavy dependencies are captured up-front
 * so each stage's Effect stays `R = never` (the pipeline carries no requirements channel). Mutable
 * fields (`dedupSet`, `createdContactEmails`, `pending`) accumulate across the run.
 */
export type SyncContext = {
  readonly db: Database.Database;
  readonly feed: Feed.Feed;
  /** Tag index the provider-label tags are applied against (mutable; feed items are immutable). */
  readonly tagIndex: TagIndex.TagIndex;
  /** Foreign-key source stamped on synced messages (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly cursorKey: number;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /** Contact emails created earlier in this run, to dedup repeats before the first commit. */
  readonly createdContactEmails: Set<string>;
  /** Resolves an existing Person by email (read-only); captured from the `Resolver` layer. */
  readonly resolveContact: (email: string) => Promise<Person.Person | undefined>;
  /** Accumulator for the current uncommitted page. */
  pending: CommitUnit[];
};

/** Default page size — kept ≤ 15 so each `Feed.append` is a single atomic queue insert. */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Seeds the dedup set of already-committed foreign ids from the feed.
 *
 * TODO(wittjosiah): This performs a full-feed read to close the append→advance crash window (a page
 * can land in the feed before its cursor advance persists, since queue and space-db are separate
 * stores with no shared transaction). Evolve in two steps: (1) replace with a bounded newest-N tail
 * read once the queue supports reverse reads — only the last in-flight page can be un-cursored; then
 * (2) drop this read entirely once feed + cursor writes can commit transactionally.
 */
const seedDedupSet = async (
  db: Database.Database,
  feed: Feed.Feed,
  foreignKeySource: string,
): Promise<Set<string>> => {
  const items = await db.queryFeed(feed, Filter.everything()).run();
  return new Set(
    items.flatMap((item) =>
      Obj.getMeta(item)
        .keys.filter((key) => key.source === foreignKeySource)
        .map((key) => key.id),
    ),
  );
};

export type RunOptions<Raw, E = never> = {
  readonly db: Database.Database;
  readonly feed: Feed.Feed;
  readonly tagIndex: TagIndex.TagIndex;
  readonly foreignKeySource: string;
  /** Cursor high-water key parsed from the binding (0 for a first sync). */
  readonly cursorKey: number;
  /** Provider source stream. The caller pre-provides its fetch context so its `R` is `never`. */
  readonly source: Stream.Stream<Raw, E>;
  /** Ordered stages (provider-specific + reusable); each stage's `Out` is the next stage's `In`. */
  readonly stages: readonly Stage.Stage<any, any, SyncContext, E>[];
  /** Resolves an existing Person by email; captured from the `Resolver` layer by the caller. */
  readonly resolveContact: (email: string) => Promise<Person.Person | undefined>;
  /** Persists the advanced cursor key onto the binding (e.g. via `Relation.update`). */
  readonly persistCursorKey: (key: number) => void;
  readonly pageSize?: number;
};

/**
 * Runs a sync pipeline: seed the dedup set, drain the source through the stages, and commit the
 * accumulated output in pages. All non-idempotent writes (feed append, contact `db.add`, tagging,
 * cursor advance) happen only in the page commit, and the cursor advances after each committed page,
 * so re-running is idempotent — a crash resumes from the last committed cursor and the dedup set
 * drops anything the in-flight page already wrote.
 */
export const run = <Raw, E = never>(options: RunOptions<Raw, E>): Effect.Effect<{ newMessages: number }, E> =>
  Effect.gen(function* () {
    const { db, feed, tagIndex, foreignKeySource, cursorKey, source, stages, resolveContact, persistCursorKey } =
      options;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

    const dedupSet = yield* Effect.promise(() => seedDedupSet(db, feed, foreignKeySource));

    const context: SyncContext = {
      db,
      feed,
      tagIndex,
      foreignKeySource,
      cursorKey,
      dedupSet,
      createdContactEmails: new Set<string>(),
      resolveContact,
      pending: [],
    };

    let newMessages = 0;

    // Commit a page: append + tag + add contacts, advance & persist the cursor, then extend the
    // dedup set so later items in this run skip anything just written.
    const flushPage = (page: readonly CommitUnit[]) =>
      Effect.gen(function* () {
        if (page.length === 0) {
          return;
        }
        const maxKey = yield* Effect.promise(() => commitPage(context, page, persistCursorKey));
        for (const unit of page) {
          context.dedupSet.add(unit.foreignId);
        }
        newMessages += page.length;
        return maxKey;
      });

    const sink: Pipeline.Sink<CommitUnit, SyncContext> = (unit, ctx) =>
      Effect.gen(function* () {
        ctx.pending.push(unit);
        if (ctx.pending.length >= pageSize) {
          const page = ctx.pending;
          ctx.pending = [];
          yield* flushPage(page);
        }
      });

    yield* Pipeline.run<Raw, CommitUnit, SyncContext, E>({
      source,
      stages,
      sink,
      context,
    });

    // Flush the trailing partial page.
    yield* flushPage(context.pending);
    context.pending = [];

    return { newMessages };
  });
