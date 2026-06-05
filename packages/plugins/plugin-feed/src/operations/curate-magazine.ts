//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { FeedOperation, Magazine, Subscription } from '../types';
import { collectCandidates, partitionByKeepBound } from './util';

/** Lightweight summary of a candidate Post handed to the curation agent. */
const Candidate = Schema.Struct({
  id: Obj.ID,
  feedName: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  published: Schema.optional(Schema.String),
  link: Schema.optional(Schema.String),
});

/** Input schema of the curation routine: the candidate Posts to choose from. */
const CurationInput = Schema.Struct({
  candidates: Schema.Array(Candidate),
});

/** Output schema of the curation routine: the selected Posts with agent-generated display values. */
const CurationOutput = Schema.Struct({
  posts: Schema.Array(
    Schema.Struct({
      id: Obj.ID,
      /** Concise 1-2 sentence snippet summarising why this article is relevant to the magazine topic. */
      snippet: Schema.optional(Schema.String),
      /** Best image URL found for this article (from the post or fetched content). */
      imageUrl: Schema.optional(Schema.String),
    }),
  ),
});

/** Bound on concurrent feed syncs. */
const SYNC_CONCURRENCY = 8;

export default FeedOperation.CurateMagazine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ magazine: magazineRef }) {
      const magazine = yield* Effect.promise(() => magazineRef.load());

      const validFeeds = yield* loadValidFeeds(magazine);
      const synced = yield* syncFeeds(validFeeds);

      // Select matching Posts via the agent (single-shot structured output), then add them mechanically.
      const candidates = yield* collectCandidates(magazine);
      const spaceId = Obj.getDatabase(magazine)?.spaceId;
      const selectedEntries =
        candidates.length > 0 && spaceId ? yield* selectPostIds(magazine, candidates, spaceId) : [];
      const selected = resolveSelected(candidates, selectedEntries);

      // Build the next posts list as a pure function of (existing curated + newly selected), bounded
      // by the magazine's `keep`, then commit it in one update. collectCandidates already excludes
      // posts already curated, so the additions are simply appended (resolveSelected deduped them).
      const db = Obj.getDatabase(magazine);
      const starredUri = db ? yield* Effect.promise(() => Subscription.findSystemTagUri(db, 'starred')) : undefined;
      const merged = [...magazine.posts, ...selected.map(({ post }) => Ref.make(post))];
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

      // Write agent-generated snippet/imageUrl into per-post magazine state.
      for (const { post, snippet, imageUrl } of selected) {
        if (snippet || imageUrl) {
          Magazine.patchPostState(magazine, post.id as EntityId, { snippet, imageUrl });
        }
      }

      return { synced, curated };
    }),
  ),
  Operation.opaqueHandler,
);

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
        Effect.catchAll((error) => Effect.sync(() => (log.catch(error, { feedUrl: feed.url }), false))),
      ),
    { concurrency: SYNC_CONCURRENCY },
  ).pipe(Effect.map((results) => results.filter(Boolean).length));

/**
 * Runs the curation agent over the candidate summaries and resolves to the selected Post ids.
 * The base methodology blueprint is referenced by its registry DXN (no clone into the space); the
 * Magazine's instructions Text carries only the topic. Tolerates agent/parse failures (logs → no selection).
 */
const selectPostIds = (
  magazine: Magazine.Magazine,
  candidates: ReadonlyArray<{ post: Subscription.Post; feed: Subscription.Subscription }>,
  spaceId: SpaceId,
) =>
  Effect.gen(function* () {
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
    const topic = (yield* Effect.promise(() => magazine.instructions.source.load())).content ?? '';
    // Resolve the base methodology blueprint from the registry by its key and hold it by value. A
    // bare `Ref.fromURI(registryURI(key))` is unhydrated — AgentPrompt's `Database.loadOption` can't
    // resolve it ("Resolver is not set") — so we resolve to the object and let `Ref.make` carry it.
    const blueprint = yield* Blueprint.resolve(Magazine.BLUEPRINT_KEY).pipe(Effect.option);
    const routine = Routine.make({
      input: CurationInput,
      output: CurationOutput,
      instructions: topic,
      blueprints: Option.toArray(blueprint).map((value) => Ref.make(value)),
    });

    return yield* Operation.invoke(AgentPrompt, { prompt: Ref.make(routine), input }, { spaceId }).pipe(
      Effect.flatMap(Schema.decodeUnknown(CurationOutput)),
      Effect.map((output) => output.posts),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          log.warn('curation selection failed', { error });
          return [] as readonly (typeof CurationOutput.Type.posts)[number][];
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
  entries: readonly { id: string; snippet?: string; imageUrl?: string }[],
): SelectedEntry[] => {
  const byId = new Map(candidates.map(({ post }) => [post.id, post]));
  const seen = new Set<string>();
  const selected: SelectedEntry[] = [];
  for (const { id, snippet, imageUrl } of entries) {
    const post = byId.get(id);
    if (post && !seen.has(id)) {
      seen.add(id);
      selected.push({ post, snippet, imageUrl });
    }
  }
  return selected;
};

/**
 * Bounds a curated posts ref list to `keep` total (non-starred) posts: keeps all starred posts and
 * unresolved refs, plus the `keep` newest non-starred by published date. Pure; returns the retained
 * refs. Delegates the sort/slice/starred partition to {@link partitionByKeepBound}.
 */
export const applyKeep = (
  posts: readonly Ref.Ref<Subscription.Post>[],
  keep: number,
  starredUri: string | undefined,
): Ref.Ref<Subscription.Post>[] => {
  const isStarred = (post: Subscription.Post) => Subscription.hasTag(post.source?.target, post.id, starredUri);
  const resolved = posts.map((ref) => ref.target).filter((post): post is Subscription.Post => post !== undefined);
  const unresolved = posts.filter((ref) => !ref.target);
  const { kept } = partitionByKeepBound(resolved, keep, isStarred);
  return [...kept.map((post) => Ref.make(post)), ...unresolved];
};
