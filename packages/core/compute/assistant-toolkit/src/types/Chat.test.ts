//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Instructions from '@dxos/compute/Instructions';
import { Annotation, Database, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { Text } from '@dxos/schema';
import { Message, Outline, Task, TaskSet } from '@dxos/types';

import { Chat } from '../types/index.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [
    Chat.Chat,
    Outline.Outline,
    Task.Task,
    TaskSet.TaskSet,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Message.Message,
  ],
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
        expect(Type.getVersion(Chat.Chat)).toBe('0.2.0');
        expect(chat.name).toBe('Test');

        // Asserted on the schema, not the instance: `in` reports false for any declared-but-unset
        // optional field. The agent a chat runs as is reached through the ECHO parent edge, never a
        // field — a field was the edge that made Agent and Chat mutually dependent.
        expect(Object.keys(Chat.fields).sort()).toEqual(['feed', 'instructions', 'name', 'tasks', 'viewType']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'addTask appends to the checklist and parents the task to the chat',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        expect(chat.tasks).toEqual([]);
        const { db } = yield* Database.Service;

        const first = Chat.addTask(db, chat, 'Buy eggs');
        const second = Chat.addTask(db, chat, 'Bake the cake', { status: 'started' });
        yield* Database.flush();

        expect(chat.tasks.map((ref) => ref.uri)).toEqual([Ref.make(first).uri, Ref.make(second).uri]);
        // The field's `SetParent` annotation makes each task a child of the conversation.
        expect(Obj.getParent(first)?.id).toBe(chat.id);
        expect(Obj.getParent(second)?.id).toBe(chat.id);

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ title, status }) => ({ title, status }))).toEqual([
          { title: 'Buy eggs', status: 'todo' },
          { title: 'Bake the cake', status: 'started' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'deleteTask sweeps the task and its sub-tasks out of the checklist',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        const { db } = yield* Database.Service;

        const parent = Chat.addTask(db, chat, 'Ship the release');
        const child = Chat.addTask(db, chat, 'Write the changelog', { parentTask: Ref.make(parent) });
        const sibling = Chat.addTask(db, chat, 'Unrelated');
        yield* Database.flush();

        const deleted = Chat.deleteTask(db, chat, yield* Chat.loadTasks(chat), parent);
        yield* Database.flush();

        expect(deleted.map((task) => task.id).sort()).toEqual([parent.id, child.id].sort());
        expect(chat.tasks.map((ref) => ref.uri)).toEqual([Ref.make(sibling).uri]);
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual(['Unrelated']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a task delegated onto the checklist keeps its owner, and is not destroyed with it',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        const { db } = yield* Database.Service;

        // The set that owns the task, as a project's does when it delegates one here.
        const owner = yield* Database.add(TaskSet.make({ name: 'Backlog' }));
        const delegated = yield* Database.add(Task.make({ title: 'Write a poem', status: 'todo' }));
        Obj.update(owner, (owner) => {
          owner.tasks = [Ref.make(delegated)];
        });
        Obj.update(chat, (chat) => {
          chat.tasks = [...chat.tasks, Ref.make(delegated)];
        });
        yield* Database.flush();

        // The chat works on the task; it does not take it. An owning checklist would re-parent it
        // here — and again on every later update of the chat.
        expect(Obj.getParent(delegated)?.id).toBe(owner.id);
        const own = Chat.addTask(db, chat, 'Draft an outline');
        expect(Obj.getParent(own)?.id).toBe(chat.id);

        // Off the checklist, still in the space: deleting is the owner's call, not the chat's.
        Chat.deleteTask(db, chat, yield* Chat.loadTasks(chat), delegated);
        yield* Database.flush();
        expect(chat.tasks.map((ref) => ref.uri)).toEqual([Ref.make(own).uri]);
        expect(yield* Database.query(Filter.id(delegated.id)).run).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'deleteTask over a partial list strands the sub-task, which is why it takes the loaded checklist',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        const { db } = yield* Database.Service;

        const parent = Chat.addTask(db, chat, 'Ship the release');
        const child = Chat.addTask(db, chat, 'Write the changelog', { parentTask: Ref.make(parent) });
        yield* Database.flush();

        // What the sync reader yields when a child is not in the working set: the walk cannot see
        // the child, so it survives in the array — and, parented to the chat, the cascade misses it.
        expect(Chat.deleteTask(db, chat, [parent], parent)).toEqual([parent]);
        expect(chat.tasks.map((ref) => ref.uri)).toEqual([Ref.make(child).uri]);

        // The loaded checklist takes it with the parent, which is the contract callers must meet.
        const restored = Chat.addTask(db, chat, 'Ship again');
        Obj.update(child, (child) => {
          child.parentTask = Ref.make(restored);
        });
        yield* Database.flush();
        expect(
          Chat.deleteTask(db, chat, yield* Chat.loadTasks(chat), restored)
            .map((task) => task.id)
            .sort(),
        ).toEqual([restored.id, child.id].sort());
        expect(chat.tasks).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'linkCompanion links a chat to an arbitrary subject: annotation ref + parent edge',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* makeChat;
        const subject = yield* Database.add(Instructions.make({ text: 'Steer.' }));
        Chat.linkCompanion({ chat, subject });
        yield* Database.flush();

        expect(Obj.getParent(chat)?.id).toBe(subject.id);
        const chats = Annotation.get(subject, Chat.CompanionChatAnnotation).pipe(Option.getOrElse(() => []));
        expect(chats.map((ref) => ref.uri)).toEqual([Ref.make(chat).uri]);

        // Idempotent per chat: linking again adds no duplicate ref.
        Chat.linkCompanion({ chat, subject });
        const again = Annotation.get(subject, Chat.CompanionChatAnnotation).pipe(Option.getOrElse(() => []));
        expect(again).toHaveLength(1);
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
      'a pending rewind round-trips on the feed',
      Effect.fnUntraced(
        function* (_) {
          const chat = yield* makeChat;
          const feed = yield* Database.load(chat.feed);
          expect(feed.rewindFrom).toBeUndefined();

          // On the feed, not the chat: the agent appends the continuation out-of-process and resolves
          // the feed, never the chat, so this is the only place both sides can see it. Stores the first
          // *discarded* message, so rewinding to the very first turn needs no sentinel.
          const messageId = EntityId.random();
          Obj.update(feed, (feed) => {
            feed.rewindFrom = messageId;
          });
          yield* Database.flush();
          expect(feed.rewindFrom).toBe(messageId);

          Obj.update(feed, (feed) => {
            feed.rewindFrom = undefined;
          });
          yield* Database.flush();
          expect(feed.rewindFrom).toBeUndefined();
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
