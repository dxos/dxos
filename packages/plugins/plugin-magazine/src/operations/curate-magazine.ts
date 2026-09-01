//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import { RunInstructions } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { FeedOperation, Magazine, Subscription } from '#types';

import { collectCandidates, partitionByKeepBound } from './util.ts';

export default FeedOperation.CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());

      // Three phases, and only two of them can be counted: the feeds are countable, the agent call
      // over every candidate is one opaque request. Reporting the phase is what the uncountable one
      // can still say — `phases`/`phase` locate the run in its plan, `current`/`total` describe the
      // phase in flight, and clearing `total` is what drops the bar rather than leaving it pinned.
      const traceWriter = yield* Trace.TraceService;
      const progressKey = FeedOperation.createCurateProgressKey(magazine);
      const label = `Curating ${magazine.name ?? 'magazine'}`;
      let current = 0;
      let total: number | undefined;
      let phase = 0;
      const reportStatus = (
        patch: { message?: string; note?: string; current?: number; total?: number; phase?: number } = {},
      ) => {
        current = patch.current ?? current;
        total = 'total' in patch ? patch.total : total;
        phase = patch.phase ?? phase;
        traceWriter.write(Trace.StatusUpdate, {
          message: patch.message ?? patch.note ?? label,
          progress: { key: progressKey, current, total, phases: PHASES, phase },
        });
      };

      const validFeeds = yield* loadValidFeeds(magazine);
      reportStatus({ phase: 0, current: 0, total: validFeeds.length, note: 'Syncing feeds' });
      const synced = yield* syncFeeds(validFeeds).pipe(
        // A run that dies without a terminal status leaves the meter holding the statusbar forever,
        // offering a cancel control for work that is no longer happening.
        Effect.tapError(() => Effect.sync(() => reportStatus({ message: PROGRESS_STATUS_FAILED }))),
      );
      reportStatus({ current: validFeeds.length });

      // Select matching Posts via the agent (single-shot structured output), then add them mechanically.
      const candidates = yield* collectCandidates(magazine);
      // No total: one agent call over every candidate, so there is nothing to count until it returns.
      reportStatus({ phase: 1, current: 0, total: undefined, note: 'Selecting articles' });
      const spaceId = Obj.getDatabase(magazine)?.spaceId;
      const selectedEntries =
        candidates.length > 0 && spaceId ? yield* selectPostIds(magazine, candidates, spaceId) : [];
      const selected = resolveSelected(candidates, selectedEntries);

      // Build the next posts list as a pure function of (existing curated + newly selected), bounded
      // by the magazine's `keep`, then commit it in one update. collectCandidates already excludes
      // posts already curated, so the additions are simply appended (resolveSelected deduped them).
      const db = Obj.getDatabase(magazine);
      const starredUri = db ? yield* Effect.promise(() => Subscription.findSystemTagUri(db, 'starred')) : undefined;
      // Resolve the already-curated refs so the keep bound can read `published`/starred off them:
      // queue-resident posts never populate `ref.target`, so without this every prior post counts as
      // unresolved and escapes the bound.
      const merged = [
        ...(yield* loadCurated(magazine.posts)),
        ...selected.map(({ post }) => ({ ref: Ref.make(post), post })),
      ];
      const nextPosts = applyKeep(merged, magazine.keep ?? Subscription.DEFAULT_KEEP, starredUri);
      const curated = selected.length;

      const changed =
        nextPosts.length !== magazine.posts.length ||
        nextPosts.some((ref, index) => ref.uri !== magazine.posts[index]?.uri);
      if (changed) {
        Obj.update(magazine, (magazine) => {
          magazine.posts = nextPosts;
        });
      }

      reportStatus({ phase: 2, current: 0, total: selected.length, note: 'Adding to magazine' });

      // Write agent-generated snippet/imageUrl into per-post magazine state.
      for (const { post, snippet, imageUrl } of selected) {
        if (snippet || imageUrl) {
          Magazine.patchPostState(magazine, post.id as EntityId, { snippet, imageUrl });
        }
      }

      reportStatus({ current: selected.length, message: PROGRESS_STATUS_COMPLETE });

      return { synced, curated };
    }),
  ),
  Operation.opaqueHandler,
);

/** Phases the curation run reports; the meter draws one step per phase. */
const PHASES = 3;

// -- Helpers --

/**
 * Resolves curated post refs, tolerating individual failures: a post whose queue entry has rotated
 * away must not fail the run, and its ref is carried through unresolved.
 */
const loadCurated = (refs: readonly Ref.Ref<Subscription.Post>[]): Effect.Effect<CuratedEntry[]> =>
  Effect.forEach(refs, (ref) =>
    Effect.tryPromise(() => ref.load()).pipe(
      Effect.map((post): CuratedEntry => ({ ref, post })),
      Effect.orElseSucceed((): CuratedEntry => ({ ref, post: undefined })),
    ),
  );

/** Bound on concurrent feed syncs. */
const SYNC_CONCURRENCY = 8;

/** Loads each referenced feed (and its backing ECHO feed), tolerating individual failures, keeping only syncable feeds. */
const loadValidFeeds = (magazine: Magazine.Magazine) =>
  Effect.forEach(magazine.feeds, (ref) =>
    Effect.gen(function* () {
      const feed = yield* Database.load(ref);
      if (feed.feed) {
        yield* Database.load(feed.feed); // Hydrate the backing ECHO feed.
      }
      return feed;
    }).pipe(
      Effect.tapError((error) => Effect.sync(() => log.catch(error))),
      Effect.option,
    ),
  ).pipe(Effect.map((feeds) => feeds.flatMap(Option.toArray).filter((feed) => Boolean(feed.url))));

/** Syncs all feeds in parallel, tolerating per-feed failures; resolves to the count synced successfully. */
const syncFeeds = (validFeeds: readonly Subscription.Subscription[]) =>
  Effect.forEach(
    validFeeds,
    (feed) =>
      Operation.invoke(
        FeedOperation.SyncFeed,
        { feed: Ref.make(feed) },
        { spaceId: Obj.getDatabase(feed)?.spaceId },
      ).pipe(
        Effect.as(true),
        Effect.catch((error) => Effect.sync(() => (log.catch(error, { feedUrl: feed.url }), false))),
      ),
    { concurrency: SYNC_CONCURRENCY },
  ).pipe(Effect.map((results) => results.filter(Boolean).length));

/**
 * Runs the curation agent over the candidate summaries and resolves to the selected Post entries.
 * The magazine's persisted Instructions (created with the magazine) carries the editorial brief and
 * references the Magazine skill, which RunInstructions resolves at run time. No instructions → no selection.
 * Tolerates agent/parse failures (logs → no selection).
 */
const selectPostIds = (
  magazine: Magazine.Magazine,
  candidates: ReadonlyArray<{ post: Subscription.Post; feed: Subscription.Subscription }>,
  spaceId: SpaceId,
) =>
  Effect.gen(function* () {
    if (!magazine.instructions) {
      return [] as readonly (typeof Magazine.CurationOutput.Type.posts)[number][];
    }
    const input = {
      candidates: candidates.map(({ post, feed }) => ({
        id: post.id,
        feedName: feed.name,
        title: post.title,
        description: post.description,
        author: post.author,
        published: post.published,
        link: post.link,
      })),
    };

    return yield* Operation.invoke(RunInstructions, { instructions: magazine.instructions, input }, { spaceId }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Magazine.CurationOutput)),
      Effect.map((output) => output.posts),
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('curation selection failed', { error });
          return [] as readonly (typeof Magazine.CurationOutput.Type.posts)[number][];
        }),
      ),
    );
  });

type SelectedEntry = {
  post: Subscription.Post;
  snippet: string | undefined;
  imageUrl: string | undefined;
};

/** Resolves the agent's selected entries back to candidate Posts, preserving order and dropping unknown/duplicate ids. */
export const resolveSelected = (
  candidates: ReadonlyArray<{ post: Subscription.Post }>,
  entries: readonly { id: string; snippet?: string | null; imageUrl?: string | null }[],
): SelectedEntry[] => {
  const byId = new Map(candidates.map(({ post }) => [post.id, post]));
  const seen = new Set<string>();
  const selected: SelectedEntry[] = [];
  for (const { id, snippet, imageUrl } of entries) {
    const post = byId.get(id);
    if (post && !seen.has(id)) {
      seen.add(id);
      // The agent may send `null` for a field it has nothing for; per-post state stores absence as
      // `undefined`, so normalize here rather than writing null into ECHO.
      selected.push({ post, snippet: snippet ?? undefined, imageUrl: imageUrl ?? undefined });
    }
  }
  return selected;
};

/** A curated post ref together with its resolved target, when it could be loaded. */
export type CuratedEntry = { ref: Ref.Ref<Subscription.Post>; post: Subscription.Post | undefined };

/**
 * Bounds a curated posts list to `keep` total (non-starred) posts: keeps all starred posts, plus the
 * `keep` newest non-starred by published date, and drops duplicates. Pure; returns the retained refs.
 * Delegates the sort/slice/starred partition to {@link partitionByKeepBound}.
 *
 * Takes resolved entries rather than bare refs. Curated Posts live in a feed queue, so `ref.target`
 * is undefined in a freshly-spawned process; the previous ref-only signature treated every such post
 * as unresolved, passed it through unbounded, and let the list grow without limit across runs.
 * An entry whose `post` could not be loaded is still carried through — a transient load failure must
 * not delete a starred post — but is deduplicated by ref uri.
 */
export const applyKeep = (
  entries: readonly CuratedEntry[],
  keep: number,
  starredUri: string | undefined,
): Ref.Ref<Subscription.Post>[] => {
  const isStarred = (post: Subscription.Post) => Subscription.hasTag(post.source?.target, post.id, starredUri);
  const deduped: CuratedEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.post?.id ?? entry.ref.uri;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }

  // Reuse each post's original ref so a queue-resident post keeps the uri it was curated under.
  const refByPostId = new Map(deduped.flatMap((entry) => (entry.post ? [[entry.post.id, entry.ref] as const] : [])));
  const resolved = deduped.map((entry) => entry.post).filter((post): post is Subscription.Post => post !== undefined);
  const unresolved = deduped.filter((entry) => !entry.post).map((entry) => entry.ref);
  const { kept } = partitionByKeepBound(resolved, keep, isStarred);
  return [...kept.map((post) => refByPostId.get(post.id) ?? Ref.make(post)), ...unresolved];
};
