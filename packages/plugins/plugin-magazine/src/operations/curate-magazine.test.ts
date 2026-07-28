//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AgentHandlers } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { StateMap, TagIndex, Text } from '@dxos/schema';

import { MagazineSkill } from '../skills';
import { FeedOperation, Magazine, Subscription } from '../types';
import { applyKeep, resolveSelected } from './curate-magazine';
import { MagazineOperationHandlerSet } from './index';

// Whether the model picks the right articles is a judgement question, graded out-of-band; scripting
// its selection keeps this on the operation's own behaviour — that the chosen ids are resolved,
// recorded on the magazine, and counted.
//
// The turns are filled in by the test once the posts exist (their ids are the payload). The scripted
// model indexes this array lazily, per call, so populating it before the operation runs is enough.
const turns: ScriptedLanguageModel.ScriptedTurn[] = [];

const selectPosts = (ids: readonly string[]) => {
  turns.length = 0;
  turns.push(
    { parts: [ScriptedLanguageModel.toolCall('completeJob', { success: { posts: ids.map((id) => ({ id })) } })] },
    // The loop asks again once the tool result is fed back; a text-only turn stops it.
    { parts: [ScriptedLanguageModel.text('Done.')] },
  );
};

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
  aiService: ScriptedLanguageModel.scriptedAiService(turns),
});

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

  test('keeps the newest posts up to the bound', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((date) =>
      Ref.make(db.add(makePost(`${date}T00:00:00Z`))),
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
    const posts = ['2026-01-01', '2026-01-02'].map((date) => Ref.make(db.add(makePost(`${date}T00:00:00Z`))));
    expect(applyKeep(posts, 10, undefined)).toHaveLength(2);
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
  it.effect(
    'records the selected posts on the magazine and counts them',
    Effect.fnUntraced(
      function* ({ expect }) {
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

        selectPosts([posts[0].id, posts[1].id]);
        const result = yield* Operation.invoke(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) });

        const curated = yield* Effect.forEach(magazine.posts, Database.load);
        expect(curated.map((post) => post.title)).toEqual([posts[0].title, posts[1].title]);
        expect(result.curated).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
