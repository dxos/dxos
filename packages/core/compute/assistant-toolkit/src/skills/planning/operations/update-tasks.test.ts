//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { test } from 'vitest';

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

import * as PlanningSkill from '../PlanningSkill.ts';
import { type TaskChange, UpdateTasks } from './definitions.ts';
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
  test('renders as a tool schema', ({ expect }) => {
    // A definition whose input cannot render as JSON Schema is dropped rather than raised, which
    // would silently leave the model with no tool at all — ref-typed inputs are the risky case.
    expect(Operation.serializable([UpdateTasks])).toHaveLength(1);
  });

  it.effect(
    'creates tasks assigned to the agent, and edits them by ref',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized({ name: 'Planner', instructions: 'Test.' }, PlanningSkill.make());
        yield* Database.flush();
        const chat = yield* Agent.loadChat(agent);
        const feed = chat?.feed?.target;
        invariant(chat && feed, 'Agent chat feed not found.');
        const invoke = invokeOn(feed);

        yield* invoke([
          { create: true, title: 'Hello', status: 'started' },
          { create: true, title: 'World' },
        ]);
        const [hello, world] = yield* Chat.loadTasks(chat);
        expect(hello?.status).toEqual('started');
        expect(world?.status).toEqual('todo');
        // What the conversation creates is its own work, whatever the status.
        expect(hello?.assignee?.subject?.target?.id).toEqual(agent.id);
        expect(world?.assignee?.subject?.target?.id).toEqual(agent.id);

        invariant(hello && world);
        yield* invoke([
          { task: Ref.make(hello), status: 'done' },
          { task: Ref.make(world), title: 'World, renamed' },
        ]);
        expect((yield* Chat.loadTasks(chat)).map(({ title, status }) => ({ title, status }))).toEqual([
          { title: 'Hello', status: 'done' },
          { title: 'World, renamed', status: 'todo' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'starting a task from elsewhere delegates it: onto the checklist and to the agent together',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();
        // A project's sub-task: it exists outside the conversation and is not on its checklist.
        const subTask = yield* Database.add(Task.make({ title: 'Name the two tools', status: 'todo' }));
        yield* Database.flush();

        yield* invoke([{ task: Ref.make(subTask), status: 'started' }]);

        expect((yield* Chat.loadTasks(chat)).map((task) => task.id)).toEqual([subTask.id]);
        expect(subTask.status).toEqual('started');
        expect(subTask.delegate?.role).toEqual('assistant');
        // A plain chat is its own session object.
        expect(subTask.delegate?.subject?.target?.id).toEqual(chat.id);
        expect((subTask.history ?? []).filter(Task.isChangeEntry).map(({ description }) => description)).toEqual([
          'Status changed from todo to started. Delegated to an agent.',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "claiming an unowned step of a person's tree answers to them, so the agent's finish waits on review",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();
        const step = yield* Database.add(Task.make({ title: 'Name the two tools', status: 'todo' }));
        const root = yield* Database.add(
          Task.make({
            title: 'Ship the tools',
            assignee: { name: 'Riley', identityDid: 'did:key:riley' },
            subtasks: [Ref.make(step)],
          }),
        );
        Obj.setParent(step, root);
        yield* Database.flush();

        yield* invoke([{ task: Ref.make(step), status: 'started' }]);
        expect(step.assignee?.name).toEqual('Riley');

        yield* invoke([{ task: Ref.make(step), status: 'done' }]);
        expect(step.status).toEqual('review');

        const legacy = yield* Database.add(
          Task.make({ title: 'Test the tools', status: 'todo', assignee: { role: 'assistant', name: 'Old session' } }),
        );
        Obj.update(root, (root) => {
          root.subtasks = [...(root.subtasks ?? []), Ref.make(legacy)];
        });
        Obj.setParent(legacy, root);
        yield* Database.flush();
        yield* invoke([{ task: Ref.make(legacy), status: 'started' }]);
        expect(legacy.assignee?.name).toEqual('Riley');

        const own = yield* Database.add(
          Task.make({
            title: 'Note the versions',
            status: 'todo',
            assignee: { role: 'assistant', subject: Ref.make(chat) },
          }),
        );
        Obj.update(root, (root) => {
          root.subtasks = [...(root.subtasks ?? []), Ref.make(own)];
        });
        Obj.setParent(own, root);
        yield* Database.flush();
        yield* invoke([{ task: Ref.make(own), status: 'started' }]);
        expect(Task.refEntityId(own.assignee?.subject)).toEqual(chat.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'assign and unassign move the checklist and the delegate together, keeping the assignee and the task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();
        const task = yield* Database.add(
          Task.make({ title: 'Renew the domain', status: 'todo', assignee: { name: 'Alice' } }),
        );
        yield* Database.flush();

        yield* invoke([{ task: Ref.make(task), assign: true }]);
        expect(chat.tasks).toHaveLength(1);
        expect(task.delegate?.subject?.target?.id).toEqual(chat.id);
        expect(task.assignee?.name).toEqual('Alice');
        expect(task.status).toEqual('todo');

        // Assigning twice must not duplicate the checklist entry.
        yield* invoke([{ task: Ref.make(task), assign: true }]);
        expect(chat.tasks).toHaveLength(1);

        yield* invoke([{ task: Ref.make(task), unassign: true }]);
        expect(chat.tasks).toEqual([]);
        expect(task.delegate).toBeUndefined();
        expect(task.assignee?.name).toEqual('Alice');
        expect(Obj.isDeleted(task)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'unassign lets go of only what this agent holds, never the person who answers for the task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();
        const task = yield* Database.add(
          Task.make({ title: 'Renew the domain', status: 'todo', assignee: { name: 'Alice' } }),
        );
        yield* Database.flush();
        yield* invoke([{ task: Ref.make(task), assign: true }]);
        Task.setDelegate(task, null);

        yield* invoke([{ task: Ref.make(task), unassign: true }]);
        expect(chat.tasks).toEqual([]);
        expect(task.assignee?.name).toEqual('Alice');

        const queued = yield* Database.add(
          Task.make({
            title: 'Draft the notice',
            status: 'todo',
            assignee: { role: 'assistant', subject: Ref.make(chat) },
            delegate: { role: 'assistant' },
          }),
        );
        Chat.assignTasks(chat, [Ref.make(queued)]);
        yield* invoke([{ task: Ref.make(queued), unassign: true }]);
        expect(chat.tasks).toEqual([]);
        expect(queued.delegate).toBeUndefined();
        expect(queued.assignee).toBeUndefined();

        const elsewhere = yield* Database.add(
          Task.make({
            title: 'Book the venue',
            status: 'todo',
            delegate: { role: 'assistant', name: 'Claude', identityDid: 'did:key:claude' },
          }),
        );
        Chat.assignTasks(chat, [Ref.make(elsewhere)]);
        yield* invoke([{ task: Ref.make(elsewhere), unassign: true }]);
        expect(chat.tasks).toEqual([]);
        expect(elsewhere.delegate?.name).toEqual('Claude');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'applies nothing when any change in the batch is malformed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();
        const { db } = yield* Database.Service;
        const task = yield* Database.add(Task.make({ title: 'Existing', status: 'todo' }));
        const notATask = yield* Database.add(Text.make({ content: 'Just some text' }));
        // `Ref.Ref(Task.Task)` decodes on ref shape alone, so a model can hand over a ref to anything.
        const claimsToBeATask = db.makeRef<Task.Task>(Obj.getURI(notATask));
        yield* Database.flush();

        const invalid: TaskChange[][] = [
          [{ title: 'No handle' }],
          [{ create: true, task: Ref.make(task), title: 'Both' }],
          [{ create: true }],
          [{ task: Ref.make(task), assign: true, unassign: true }],
          [{ task: Ref.make(task), status: 'started', unassign: true }],
          [{ task: claimsToBeATask, status: 'done' }],
        ];
        for (const changes of invalid) {
          // The valid change in front must not land: the batch is all or nothing.
          const exit = yield* invoke([{ create: true, title: 'Should not exist' }, ...changes]).pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toBe(true);
        }

        expect(chat.tasks).toEqual([]);
        expect(task.status).toEqual('todo');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'emits a status trace event for every change, and none for a no-op update',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat();

        yield* invoke([{ create: true, title: 'Hello' }]);
        const [task] = yield* Chat.loadTasks(chat);
        invariant(task);
        yield* invoke([{ task: Ref.make(task), status: 'started' }]);
        // Same status twice: nothing changed, so nothing is traced.
        yield* invoke([{ task: Ref.make(task), status: 'started' }]);
        yield* invoke([{ task: Ref.make(task), status: 'done' }]);
        yield* Database.flush();

        const events = yield* readStatusEvents;
        expect(events).toEqual([
          { taskId: task.id, title: 'Hello', status: 'todo' },
          { taskId: task.id, title: 'Hello', status: 'started', previousStatus: 'todo' },
          { taskId: task.id, title: 'Hello', status: 'done', previousStatus: 'started' },
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
        const { invoke } = yield* setupChat();
        const task = yield* Database.add(
          Task.make({ title: 'Reviewed', status: 'started', assignee: { name: 'Alice', role: 'user' } }),
        );
        yield* Database.flush();

        yield* invoke([{ task: Ref.make(task), status: 'done' }]);
        yield* Database.flush();

        const events = yield* readStatusEvents;
        expect(events).toEqual([{ taskId: task.id, title: 'Reviewed', status: 'review', previousStatus: 'started' }]);
      },
      Effect.provide(TracingTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  /** The status events on the space's trace feed, in the order they were written. */
  const readStatusEvents = Effect.gen(function* () {
    // The sink batches its appends, so the trace can trail the operation that wrote it.
    yield* FeedTraceSink.flush();
    yield* Database.flush();
    const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
    const messages = yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed)).run;
    return messages
      .flatMap((message) => message.events)
      .filter((event) => event.type === Trace.TaskStatusChanged.key)
      .map((event) => Schema.decodeUnknownSync(Trace.TaskStatusChanged.schema)(event.data));
  });
});

/** Invokes the tool as the conversation on `feed`, which is how `Harness.getChat` reaches its chat. */
const invokeOn = (feed: Feed.Feed) => (changes: readonly TaskChange[]) =>
  Operation.invoke(UpdateTasks, { changes }).pipe(
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
  );

/** A chat with no agent above it, bound to its own feed. */
const setupChat = Effect.fnUntraced(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));
  return { chat, invoke: invokeOn(feed) };
});
