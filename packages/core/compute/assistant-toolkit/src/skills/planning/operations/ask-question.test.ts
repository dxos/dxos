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
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Question, Task } from '@dxos/types';

import PlanningSkill from '../skill.ts';
import { AskQuestion, UpdateTasks } from './definitions.ts';
import { PlanningHandlers } from './index.ts';

EntityId.dangerouslyDisableRandomness();

const layerOptions = {
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Outline.Outline, Task.Task, Question.Question, Text.Text, Chat.Chat, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
};

const TestLayer = AssistantTestLayer(layerOptions);
const TracingTestLayer = AssistantTestLayer({ ...layerOptions, tracing: 'feed' });

/** A chat with a bound conversation feed, and an `invoke` that runs against it. */
const setupChat = Effect.gen(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));
  const conversation = Operation.withInvocationOptions({ conversation: Obj.getURI(feed) });
  return {
    chat,
    invoke: <I, O>(op: Operation.Definition<I, O>, input: I) =>
      Operation.invoke(op, input).pipe(Effect.provide(conversation)),
  };
});

/** The questions filed in the database, newest last. */
const loadQuestions = Database.query(Filter.type(Question.Question)).run;

describe('AskQuestion', () => {
  it.effect(
    'files a question on the task and blocks it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, { changes: [{ create: true, title: 'Draft the reply', status: 'started' }] });

        const result = yield* invoke(AskQuestion, {
          task: 'Draft the reply',
          question: 'What is our refund window?',
          context: 'The order is 45 days old and nothing in the project states the policy.',
          options: [{ title: '30 days' }, { title: '60 days', description: 'Enterprise terms.' }],
        });
        yield* Database.flush();

        const [task] = yield* Chat.loadTasks(chat);
        expect(task.status).toBe('blocked');

        const [question] = yield* loadQuestions;
        expect(question.text).toBe('What is our refund window?');
        expect(question.options?.map(({ title }) => title)).toEqual(['30 days', '60 days']);
        expect(Task.refEntityId(question.task)).toBe(task.id);
        expect(question.conversation?.target?.id).toBe(chat.id);
        expect(Question.isAnswered(question)).toBe(false);

        // Filed on the task, so a reader arriving at the blocked task finds what is holding it.
        expect(task.artifacts?.map((ref) => Task.refEntityId(ref))).toEqual([question.id]);
        // Owned by the task, so it does not outlive the work it was about.
        expect(Obj.getParent(question)?.id).toBe(task.id);
        // The result carries the checklist back, as every planning tool does.
        expect(String(result)).toContain('Draft the reply');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'asks nothing when no checklist task carries the title',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, { changes: [{ create: true, title: 'Draft the reply', status: 'started' }] });

        const result = yield* invoke(AskQuestion, { task: 'Some other task', question: 'Anything?' });
        yield* Database.flush();

        expect(yield* loadQuestions).toEqual([]);
        const [task] = yield* Chat.loadTasks(chat);
        expect(task.status).toBe('started');
        expect(String(result)).toContain('No task titled');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses a second question while the first is unanswered',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, { changes: [{ create: true, title: 'Draft the reply', status: 'started' }] });
        yield* invoke(AskQuestion, { task: 'Draft the reply', question: 'What is our refund window?' });

        // A retried tool call: the reader must not end up with two questions on one task.
        const result = yield* invoke(AskQuestion, { task: 'Draft the reply', question: 'Asking again?' });
        yield* Database.flush();

        const questions = yield* loadQuestions;
        expect(questions.map(({ text }) => text)).toEqual(['What is our refund window?']);
        expect(String(result)).toContain('already has an unanswered question');
        const [task] = yield* Chat.loadTasks(chat);
        expect(task.artifacts?.length).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses a title two tasks share rather than blocking either',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, {
          changes: [
            { create: true, title: 'Draft the reply' },
            { create: true, title: 'Draft the reply' },
          ],
        });

        const result = yield* invoke(AskQuestion, { task: 'Draft the reply', question: 'Which one?' });
        yield* Database.flush();

        expect(yield* loadQuestions).toEqual([]);
        expect(String(result)).toContain('is the title of 2 tasks');
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ status }) => status)).toEqual(['todo', 'todo']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'asks again once the first question has been answered',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, { changes: [{ create: true, title: 'Draft the reply', status: 'started' }] });
        yield* invoke(AskQuestion, { task: 'Draft the reply', question: 'First?' });
        const [first] = yield* loadQuestions;
        Question.answer(first, '30 days');
        yield* Database.flush();

        yield* invoke(AskQuestion, { task: 'Draft the reply', question: 'Second?' });
        yield* Database.flush();

        const questions = yield* loadQuestions;
        expect(questions.map(({ text }) => text).sort()).toEqual(['First?', 'Second?']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'traces the question alongside the status change it caused',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { chat, invoke } = yield* setupChat;
        yield* invoke(UpdateTasks, { changes: [{ create: true, title: 'Draft the reply', status: 'started' }] });
        yield* invoke(AskQuestion, {
          task: 'Draft the reply',
          question: 'What is our refund window?',
          options: [{ title: '30 days' }],
        });
        yield* Database.flush();

        const [task] = yield* Chat.loadTasks(chat);
        const [question] = yield* loadQuestions;
        expect(yield* readEvents(Trace.TaskStatusChanged)).toEqual([
          { taskId: task.id, title: 'Draft the reply', status: 'started' },
          { taskId: task.id, title: 'Draft the reply', status: 'blocked', previousStatus: 'started' },
        ]);
        expect(yield* readEvents(Trace.QuestionAsked)).toEqual([
          {
            questionId: question.id,
            text: 'What is our refund window?',
            taskId: task.id,
            options: 1,
          },
        ]);
      },
      Effect.provide(TracingTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  /** Events of one type on the space's trace feed, in the order they were written. */
  const readEvents = <T>(eventType: Trace.EventType<T>) =>
    Effect.gen(function* () {
      const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
      const messages = yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed)).run;
      return messages
        .flatMap((message) => message.events)
        .filter((event) => event.type === eventType.key)
        .map((event) => Schema.decodeUnknownSync(eventType.schema)(event.data));
    });
});
