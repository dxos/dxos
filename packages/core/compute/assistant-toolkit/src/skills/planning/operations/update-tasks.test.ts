//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task } from '@dxos/types';

import PlanningSkill from '../skill.ts';
import { AssignTasks, UpdateTasks } from './definitions.ts';
import { PlanningHandlers } from './index.ts';

EntityId.dangerouslyDisableRandomness();

const layerOptions = {
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Outline.Outline, Task.Task, Text.Text, Chat.Chat, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
};

const TestLayer = AssistantTestLayer(layerOptions);

/** Persists trace events so a test can read back what the tool emitted. */
const TracingTestLayer = AssistantTestLayer({ ...layerOptions, tracing: 'feed' });

describe('UpdateTasks', () => {
  it.effect(
    "adds tasks to the chat's checklist",
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized({ name: 'Planner', instructions: 'Test.' }, PlanningSkill.make());
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ title: 'Hello', status: 'todo' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })));

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ title, status }) => ({ title, status }))).toEqual([{ title: 'Hello', status: 'todo' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'adds tasks without an agent, and completes them in place',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        expect(chat.tasks).toEqual([]);
        const runtime = yield* Effect.context<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [
            { title: 'Hello', status: 'todo' },
            { title: 'World', status: 'started' },
          ],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ title: 'Hello', status: 'done' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ title, status }) => ({ title, status }))).toEqual([
          { title: 'Hello', status: 'done' },
          { title: 'World', status: 'started' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'emits a status trace event for every change, and none for a no-op update',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));
        const invoke = (tasks: { title: string; status: 'todo' | 'started' | 'done' }[]) =>
          Operation.invoke(UpdateTasks, { tasks }).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
          );

        yield* invoke([{ title: 'Hello', status: 'todo' }]);
        yield* invoke([{ title: 'Hello', status: 'started' }]);
        // Same status twice: nothing changed, so nothing is traced.
        yield* invoke([{ title: 'Hello', status: 'started' }]);
        yield* invoke([{ title: 'Hello', status: 'done' }]);
        yield* Database.flush();

        const tasks = yield* Chat.loadTasks(chat);
        const taskId = tasks[0]?.id;
        const events = yield* readStatusEvents;
        expect(events).toEqual([
          { taskId, title: 'Hello', status: 'todo' },
          { taskId, title: 'Hello', status: 'started', previousStatus: 'todo' },
          { taskId, title: 'Hello', status: 'done', previousStatus: 'started' },
        ]);
      },
      Effect.provide(TracingTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'traces the status a task actually landed in, not the one requested',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));
        // A task with reviewers does not close on the model's word: `done` lands it in `review`.
        const task = yield* Database.add(
          Task.make({ title: 'Reviewed', status: 'started', reviewers: [{ name: 'Alice' }] }),
        );
        yield* Operation.invoke(AssignTasks, { add: [Ref.make(task)] }).pipe(
          Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
        );

        yield* Operation.invoke(UpdateTasks, { tasks: [{ title: 'Reviewed', status: 'done' }] }).pipe(
          Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
        );
        yield* Database.flush();

        const events = yield* readStatusEvents;
        expect(events).toEqual([{ taskId: task.id, title: 'Reviewed', status: 'review', previousStatus: 'started' }]);
      },
      Effect.provide(TracingTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** The status events on the space's trace feed, in the order they were written. */
const readStatusEvents = Effect.gen(function* () {
  const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
  const messages = yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed)).run;
  return messages
    .flatMap((message) => message.events)
    .filter((event) => event.type === Trace.TaskStatusChanged.key)
    .map((event) => Schema.decodeUnknownSync(Trace.TaskStatusChanged.schema)(event.data));
});
