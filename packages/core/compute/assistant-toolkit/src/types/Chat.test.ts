//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Instructions } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Chat, Plan } from '../types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [Chat.Chat, Chat.CompanionTo, Plan.Plan, Feed.Feed, Text.Text, Instructions.Instructions, Message.Message],
  disableLlmMemoization: true,
});

const makeChat = Effect.gen(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));
  yield* Database.flush();
  return chat;
});

describe('Chat', () => {
  it.effect(
    'is a standalone type carrying no agent reference',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;

        expect(Type.getTypename(Chat.Chat)).toBe('org.dxos.type.assistant.chat');
        expect(Type.getVersion(Chat.Chat)).toBe('0.1.0');
        expect(chat.name).toBe('Test');

        // Asserted on the schema, not the instance: `in` reports false for any declared-but-unset
        // optional field. The agent a chat runs as is reached through CompanionTo, never a field —
        // that field was the edge that made Agent and Chat mutually dependent.
        expect(Object.keys(Chat.Chat.fields).sort()).toEqual(['feed', 'instructions', 'name', 'plan', 'viewType']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ensurePlan attaches a plan lazily and returns the same one thereafter',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        expect(chat.plan).toBeUndefined();

        const plan = yield* Chat.ensurePlan(chat);
        expect(chat.plan?.uri).toBe(Ref.make(plan).uri);
        expect(plan.tasks).toEqual([]);

        // Second call reuses the attached plan rather than replacing it.
        const again = yield* Chat.ensurePlan(chat);
        expect(again.id).toBe(plan.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'CompanionTo links a chat to an arbitrary companion object',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        const companion = yield* Database.add(Instructions.make({ text: 'Steer.' }));
        const relation = yield* Database.add(
          Relation.make(Chat.CompanionTo, {
            [Relation.Source]: chat,
            [Relation.Target]: companion,
          }),
        );
        yield* Database.flush();

        expect(Relation.getSource(relation).id).toBe(chat.id);
        expect(Relation.getTarget(relation).id).toBe(companion.id);
        expect(Obj.instanceOf(Chat.Chat, Relation.getSource(relation))).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Rewind (soft fork).
  //

  describe('rewind', () => {
    it.effect(
      'continuing from an earlier message leaves the turns after it unreachable',
      Effect.fnUntraced(
        function* (_) {
          const chat = yield* makeChat;
          const feed = yield* Database.load(chat.feed);

          const first = message('first question');
          const answer = message('first answer', 'assistant');
          const abandoned = message('abandoned question');
          const abandonedAnswer = message('abandoned answer', 'assistant');
          yield* Feed.append(feed, [first, answer, abandoned, abandonedAnswer]);

          // Rewind to `answer`: the retry names it as its lineage parent rather than the feed's tip.
          const retry = message('better question');
          yield* Feed.append(feed, [retry], { parent: answer });
          yield* Database.flush();

          const history = Feed.history(yield* readFeed(feed));
          expect(history.items.map((item) => item.id)).toEqual([first.id, answer.id, retry.id]);
          expect(history.shallow).toBe(false);

          // The abandoned turns are still in the log — a rewind hides, it does not delete.
          const all = yield* readFeed(feed);
          expect(all.map((item) => item.id)).toContain(abandoned.id);
          expect(all.map((item) => item.id)).toContain(abandonedAnswer.id);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.effect(
      'rewinding twice makes the most recent branch the live one',
      Effect.fnUntraced(
        function* (_) {
          const chat = yield* makeChat;
          const feed = yield* Database.load(chat.feed);

          const first = message('first question');
          const answer = message('first answer', 'assistant');
          const second = message('second question');
          yield* Feed.append(feed, [first, answer, second]);

          const retryA = message('retry A');
          yield* Feed.append(feed, [retryA], { parent: answer });
          const retryB = message('retry B');
          yield* Feed.append(feed, [retryB], { parent: second });
          yield* Database.flush();

          // Latest-wins: retryB's branch is live, so retryA drops out.
          const history = Feed.history(yield* readFeed(feed));
          expect(history.items.map((item) => item.id)).toEqual([first.id, answer.id, second.id, retryB.id]);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.effect(
      'a fork point round-trips on the feed',
      Effect.fnUntraced(
        function* (_) {
          const chat = yield* makeChat;
          const feed = yield* Database.load(chat.feed);
          expect(feed.forkPoint).toBeUndefined();

          // On the feed, not the chat: the agent appends the continuation out-of-process and resolves
          // the feed, never the chat, so this is the only place both sides can see it.
          const messageId = EntityId.random();
          Obj.update(feed, (feed) => {
            feed.forkPoint = messageId;
          });
          yield* Database.flush();
          expect(feed.forkPoint).toBe(messageId);

          Obj.update(feed, (feed) => {
            feed.forkPoint = undefined;
          });
          yield* Database.flush();
          expect(feed.forkPoint).toBeUndefined();
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.effect(
      'a feed that was never rewound reads back whole',
      Effect.fnUntraced(
        function* (_) {
          const chat = yield* makeChat;
          const feed = yield* Database.load(chat.feed);

          const messages = [message('one'), message('two', 'assistant'), message('three')];
          yield* Feed.append(feed, messages);
          yield* Database.flush();

          const history = Feed.history(yield* readFeed(feed));
          expect(history.items.map((item) => item.id)).toEqual(messages.map((item) => item.id));
          expect(history.shallow).toBe(false);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });
});

let clock = 0;

const message = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

/**
 * Reads a feed's messages in append order — `Feed.history` walks lineage positionally, and a query
 * returns an unordered set.
 */
const readFeed = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const position = (item: Message.Message) =>
      Number(Obj.getKeys(item, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id ?? Number.POSITIVE_INFINITY);
    return [...messages].sort((a, b) => position(a) - position(b));
  });
