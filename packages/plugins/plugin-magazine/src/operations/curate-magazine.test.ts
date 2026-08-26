//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AgentHandlers } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref, Tag, URI } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { StateMap, TagIndex, Text } from '@dxos/schema';

import { MagazineOperationHandlerSet } from '#operations';
import { MagazineSkill } from '#skills';
import { FeedOperation, Magazine, Subscription } from '#types';

import { applyKeep, resolveSelected } from './curate-magazine';

/**
 * Whether the model picks the right articles is a judgement question, graded out-of-band; scripting
 * its selection keeps this on the operation's own behaviour — that the chosen ids are resolved,
 * recorded on the magazine, and counted.
 *
 * The script is per-test state, but the layer captures the turns array once at module load and the
 * model indexes it lazily per call. Holding it in a closure gives the layer a stable reference while
 * `reset` clears the script between tests, so no turn leaks from one test into the next.
 */
const createScriptedSelection = () => {
  const turns: ScriptedLanguageModel.ScriptedTurn[] = [];
  return {
    aiService: ScriptedLanguageModel.scriptedAiService(turns),

    /** Scripts the agent to select `ids` and then finish. Call once the posts exist. */
    select: (ids: readonly string[]) => {
      turns.push(
        { parts: [ScriptedLanguageModel.toolCall('completeJob', { success: { posts: ids.map((id) => ({ id })) } })] },
        // The loop asks again once the tool result is fed back; a text-only turn stops it.
        { parts: [ScriptedLanguageModel.text('Done.')] },
      );
    },

    reset: () => {
      turns.length = 0;
    },
  };
};

const scripted = createScriptedSelection();

const TestLayer = AssistantTestLayer({
  operationHandlers: [MagazineOperationHandlerSet, AgentHandlers],
  types: [
    Feed.Feed,
    Subscription.Subscription,
    Subscription.Post,
    Magazine.Magazine,
    Tag.Tag,
    Text.Text,
    StateMap.StateMap,
    TagIndex.TagIndex,
  ],
  skills: [MagazineSkill.make()],
  aiService: scripted.aiService,
});

/** Stands in for a feed's backing queue in the ref uris below. */
const QUEUE_ID = '01M0V0000000000000000QUEUE';

describe('applyKeep', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Magazine.Magazine,
        Tag.Tag,
        Text.Text,
        StateMap.StateMap,
        TagIndex.TagIndex,
      ],
    });
    return { db };
  };

  const makePost = (published: string): Subscription.Post =>
    Obj.make(Subscription.Post, { title: `Post ${published}`, description: 'body', published });

  const entry = (post: Subscription.Post) => ({ ref: Ref.make(post), post });

  test('keeps the newest posts up to the bound', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((date) =>
      entry(db.add(makePost(`${date}T00:00:00Z`))),
    );

    const kept = applyKeep(posts, 2, undefined);
    const keptDates = kept.map((ref) => ref.target?.published);
    expect(kept).toHaveLength(2);
    expect(keptDates).toContain('2026-01-03T00:00:00Z');
    expect(keptDates).toContain('2026-01-02T00:00:00Z');
    expect(keptDates).not.toContain('2026-01-01T00:00:00Z');
  });

  test('no-ops when within the bound', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02'].map((date) => entry(db.add(makePost(`${date}T00:00:00Z`))));
    expect(applyKeep(posts, 10, undefined)).toHaveLength(2);
  });

  // Curated posts live in a feed queue, whose refs never populate `ref.target`. The bound used to
  // read the target directly, so every prior post counted as unresolved and escaped it — the list
  // grew past `keep` on every run.
  test('bounds posts whose refs do not resolve their target', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((date) => db.add(makePost(`${date}T00:00:00Z`)));
    // Models a queue-resident post: the caller resolved it, but its ref does not resolve a target
    // (the uri names a queue this database cannot resolve through).
    const queueUri = (post: Subscription.Post) =>
      URI.make(`${Obj.getURI(post).toString().split('/').slice(0, -1).join('/')}/${QUEUE_ID}/${post.id}`);
    const entries = posts.map((post) => ({ ref: Ref.fromURI(queueUri(post)), post }));
    // Guards the test itself: if these refs ever resolve, it no longer covers the case it was written
    // for. A ref with no resolver throws on `target` rather than returning undefined — which is the
    // second reason the bound must not read it.
    const resolvesTarget = (ref: Ref.Ref<Subscription.Post>) => {
      try {
        return ref.target !== undefined;
      } catch {
        return false;
      }
    };
    expect(entries.every(({ ref }) => !resolvesTarget(ref))).toBe(true);

    const kept = applyKeep(entries, 2, undefined);
    expect(kept).toHaveLength(2);
  });

  test('drops duplicate entries', async () => {
    const { db } = await setup();
    const post = db.add(makePost('2026-01-01T00:00:00Z'));
    expect(applyKeep([entry(post), entry(post)], 10, undefined)).toHaveLength(1);
  });
});

describe('resolveSelected', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('maps ids to posts in order, dropping unknown and duplicate ids', async () => {
    const { db } = await builder.createDatabase({ types: [Subscription.Post] });
    const posts = ['a', 'b', 'c'].map((title) => db.add(Obj.make(Subscription.Post, { title })));
    await db.flush();
    const candidates = posts.map((post) => ({ post }));

    const selected = resolveSelected(candidates, [
      { id: posts[2].id },
      { id: 'missing-id' },
      { id: posts[0].id },
      { id: posts[2].id },
    ]);

    expect(selected.map(({ post }) => post.id)).toEqual([posts[2].id, posts[0].id]);
  });
});

describe('CurateMagazine', () => {
  beforeEach(() => scripted.reset());
  afterEach(() => scripted.reset());

  it.effect(
    'records the selected posts on the magazine and counts them',
    Effect.fnUntraced(
      function* (_) {
        const subscription = yield* Database.add(
          Subscription.makeSubscription({ name: 'Tech & Science Daily', type: 'rss' }),
        );
        yield* Database.flush();

        const postFeed = yield* Database.load(subscription.feed);
        const posts = ['Mars lander touches down', 'Webb images a nebula', 'Quarterly earnings'].map((title) =>
          Obj.make(Subscription.Post, {
            title,
            link: `https://example.com/${title}`,
            published: '2026-05-01T00:00:00Z',
            source: Ref.make(subscription),
          }),
        );
        yield* Feed.append(postFeed, posts);
        yield* Database.flush();

        // `Magazine.make` composes the Instructions (with the CurationOutput contract) from the topic.
        const magazine = yield* Database.add(
          Magazine.make({
            name: 'The Cosmos',
            feeds: [Ref.make(subscription)],
            instructions: 'Curate articles about space exploration and astronomy.',
          }),
        );
        yield* Database.flush();

        scripted.select([posts[0].id, posts[1].id]);
        const result = yield* Operation.invoke(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) });

        const curated = yield* Effect.forEach(magazine.posts, Database.load);
        expect(curated.map((post) => post.title)).toEqual([posts[0].title, posts[1].title]);
        expect(result.curated).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // A second run is a different code path from the first: it resolves the already-curated refs before
  // bounding them, and filters them out of the candidate set. Curating only into an empty magazine
  // left both untested — which is how re-running used to re-offer, and re-add, every curated post.
  it.effect(
    'does not offer posts it already curated as candidates',
    Effect.fnUntraced(
      function* (_) {
        const subscription = yield* Database.add(
          Subscription.makeSubscription({ name: 'Tech & Science Daily', type: 'rss' }),
        );
        yield* Database.flush();

        const postFeed = yield* Database.load(subscription.feed);
        const posts = ['Mars lander touches down', 'Webb images a nebula'].map((title) =>
          Obj.make(Subscription.Post, {
            title,
            link: `https://example.com/${title}`,
            published: '2026-05-01T00:00:00Z',
            source: Ref.make(subscription),
          }),
        );
        yield* Feed.append(postFeed, posts);
        yield* Database.flush();

        const magazine = yield* Database.add(
          Magazine.make({
            name: 'The Cosmos',
            feeds: [Ref.make(subscription)],
            instructions: 'Curate articles about space exploration and astronomy.',
          }),
        );
        yield* Database.flush();

        // Both runs are scripted up front: the model reads the turn list by index across the whole
        // test, so a selection queued between runs would arrive after the second run asked for it.
        // Each run picks the same post — the second run must not be able to.
        scripted.select([posts[0].id]);
        scripted.select([posts[0].id]);
        scripted.select([posts[0].id]);

        const first = yield* Operation.invoke(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) });
        yield* Database.flush();
        expect(first.curated).toBe(1);

        // Curated posts are no longer candidates, so the agent's repeat pick resolves to nothing.
        const second = yield* Operation.invoke(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) });
        expect(second.curated).toBe(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
