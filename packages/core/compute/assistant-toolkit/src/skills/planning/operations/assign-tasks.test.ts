//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task } from '@dxos/types';

import PlanningSkill from '../skill';
import { AssignTasks } from './definitions';
import { PlanningHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Outline.Outline, Task.Task, Text.Text, Chat.Chat, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
});

describe('AssignTasks', () => {
  it('renders as a tool schema', ({ expect }) => {
    // A definition whose input cannot render as JSON Schema is dropped rather than raised, which
    // would silently leave the model with no tool at all — ref-typed inputs are the risky case.
    expect(Operation.serializable([AssignTasks])).toHaveLength(1);
  });

  it.effect(
    'assigns existing tasks to the checklist and unassigns others',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, options } = yield* setupChat();
        const first = yield* Database.add(Task.make({ title: 'First', status: 'todo' }));
        const second = yield* Database.add(Task.make({ title: 'Second', status: 'started' }));

        yield* Operation.invoke(AssignTasks, { add: [Ref.make(first), Ref.make(second)] }).pipe(
          Effect.provide(options),
        );
        expect((yield* Chat.loadTasks(chat)).map((task) => task.title)).toEqual(['First', 'Second']);

        yield* Operation.invoke(AssignTasks, { remove: [Ref.make(first)] }).pipe(Effect.provide(options));
        expect((yield* Chat.loadTasks(chat)).map((task) => task.title)).toEqual(['Second']);

        // Unassigning is membership-only: the task survives for whoever else holds it.
        expect(Obj.isDeleted(first)).toBe(false);
        expect(first.title).toEqual('First');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ignores a task already on the checklist and one that was never on it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, options } = yield* setupChat();
        const { db } = yield* Database.Service;
        const owned = Chat.addTask(db, chat, 'Owned');
        const stranger = yield* Database.add(Task.make({ title: 'Stranger', status: 'todo' }));
        yield* Database.flush();

        // Re-adding must not duplicate the entry, and removing a non-member must not disturb it.
        yield* Operation.invoke(AssignTasks, {
          add: [Ref.make(owned)],
          remove: [Ref.make(stranger)],
        }).pipe(Effect.provide(options));

        expect(chat.tasks).toHaveLength(1);
        expect((yield* Chat.loadTasks(chat)).map((task) => task.title)).toEqual(['Owned']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'rejects a reference that does not point at a task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, options } = yield* setupChat();
        const { db } = yield* Database.Service;
        const notATask = yield* Database.add(Text.make({ content: 'Just some text' }));
        // `Ref.Ref(Task.Task)` decodes on ref shape alone — a ref's target may not be loaded, so the
        // schema cannot vouch for its type. Built from the URI the way the tool's decoder does, so
        // the ref claims to be a task exactly as a model-supplied one would.
        const claimsToBeATask = db.makeRef<Task.Task>(Obj.getURI(notATask));

        yield* Operation.invoke(AssignTasks, { add: [claimsToBeATask] }).pipe(Effect.provide(options));

        expect(chat.tasks).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps a task named on both sides of the same call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, options } = yield* setupChat();
        const task = yield* Database.add(Task.make({ title: 'Contested', status: 'todo' }));

        yield* Operation.invoke(AssignTasks, {
          add: [Ref.make(task)],
          remove: [Ref.make(task)],
        }).pipe(Effect.provide(options));

        expect((yield* Chat.loadTasks(chat)).map((task) => task.title)).toEqual(['Contested']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** The chat on the conversation's feed, which is how `Harness.getChat` reaches it. */
const setupChat = Effect.fnUntraced(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));
  return { chat, options: Operation.withInvocationOptions({ conversation: Obj.getURI(feed) }) };
});
