//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Chat from '@dxos/assistant/Chat';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Task } from '@dxos/types';

import { AssistantOperationHandlerSet } from '#operations';
import { AssistantOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

/** Prompts the operation sent, in order — a stand-in for the agent that would have received them. */
type Prompt = { chat?: string; prompt: string; disposition?: string };

const prompts: Prompt[] = [];

/**
 * Replaces `RunPromptInChat` so the resume can be asserted without standing up an agent turn: the
 * question of interest is what the operation asks for, not what a model does with it. Placed first
 * in the merge, which is where resolution stops.
 */
/** Set by a test to make the stubbed resume fail, exercising the handler's recovery arm. */
let resumeFails = false;

const StubRunPrompt = OperationHandlerSet.make(
  AssistantOperation.RunPromptInChat.pipe(
    Operation.withHandler(({ chat, prompt, disposition }) =>
      resumeFails
        ? Effect.die(new Error('no agent host'))
        : Effect.sync(() => {
            prompts.push({ chat: chat?.id, prompt, disposition });
          }),
    ),
  ),
);

/**
 * `RunPromptInChat` declares `Capability.Service`, and the invoker resolves services from the
 * DEFINITION — so the stub above still needs one present, even though its body never reads it.
 */
const makeCapabilityManager = () => {
  const registry = AtomRegistry.make();
  const manager = CapabilityManager.make({ registry });
  manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
  return manager;
};

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.merge(StubRunPrompt, AssistantOperationHandlerSet),
  types: [Chat.Chat, Feed.Feed, Text.Text, Task.Task],
  tracing: 'feed',
  extraServices: Layer.sync(Capability.Service, makeCapabilityManager),
});

/** A question filed on a task of a chat, exactly as `ask-question` leaves it. */
const setup = Effect.gen(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  const task = yield* Database.add(Task.make({ title: 'Draft the reply', status: 'blocked' }));
  const question = Task.ask(task, {
    text: 'What is our refund window?',
    options: [{ title: '30 days' }],
    conversation: Ref.make(chat),
  });
  yield* Database.flush();
  return { chat, task, question };
});

/** The recorded answer to one of a task's questions. */
const answerOf = (task: Task.Task, questionId: string): string | undefined =>
  Task.getQuestions(task.history).find(({ question }) => question.id === questionId)?.answer?.answer;

describe('AnswerQuestion', () => {
  it.effect(
    'records the answer, traces it, and wakes the conversation that asked',
    Effect.fnUntraced(
      function* ({ expect }) {
        prompts.length = 0;
        const { chat, task, question } = yield* setup;

        const { accepted, resumed } = yield* Operation.invoke(AssistantOperation.AnswerQuestion, {
          task,
          question: question.id,
          answer: '30 days',
        });
        yield* Database.flush();

        expect(accepted).toBe(true);
        expect(resumed).toBe(true);
        expect(answerOf(task, question.id)).toBe('30 days');
        expect(Task.getPendingQuestions(task.history)).toEqual([]);

        expect(yield* readEvents(Trace.QuestionAnswered)).toEqual([
          {
            questionId: question.id,
            text: 'What is our refund window?',
            taskId: task.id,
            answer: '30 days',
          },
        ]);

        expect(prompts).toHaveLength(1);
        expect(prompts[0].chat).toBe(chat.id);
        expect(prompts[0].disposition).toBe('synthetic');
        // Names the task and the question entry rather than quoting the answer: the agent reads
        // the record back off the task.
        expect(prompts[0].prompt).toContain('Draft the reply');
        expect(prompts[0].prompt).toContain(question.id);
        expect(prompts[0].prompt).not.toContain('30 days');

        // The task stays blocked: only the agent knows whether the answer cleared what it was on.
        expect(task.status).toBe('blocked');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps the answer when the agent cannot be reached, and says the resume failed',
    Effect.fnUntraced(
      function* ({ expect }) {
        prompts.length = 0;
        resumeFails = true;
        const { question, task } = yield* setup;

        const { accepted, resumed } = yield* Operation.invoke(AssistantOperation.AnswerQuestion, {
          task,
          question: question.id,
          answer: '30 days',
        });
        yield* Database.flush();
        resumeFails = false;

        // The reader answered; a host that cannot reach the agent must not take that back.
        expect(accepted).toBe(true);
        expect(resumed).toBe(false);
        expect(answerOf(task, question.id)).toBe('30 days');
        expect(yield* readEvents(Trace.QuestionAnswered)).toHaveLength(1);
        // Left blocked, which is a state a person can see and retry from.
        expect(task.status).toBe('blocked');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses a second answer, so the agent is never resumed twice',
    Effect.fnUntraced(
      function* ({ expect }) {
        prompts.length = 0;
        const { task, question } = yield* setup;

        yield* Operation.invoke(AssistantOperation.AnswerQuestion, { task, question: question.id, answer: '30 days' });
        const second = yield* Operation.invoke(AssistantOperation.AnswerQuestion, {
          task,
          question: question.id,
          answer: '60 days',
        });
        yield* Database.flush();

        expect(second.accepted).toBe(false);
        expect(answerOf(task, question.id)).toBe('30 days');
        expect(prompts).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses a blank answer, writing nothing at all',
    Effect.fnUntraced(
      function* ({ expect }) {
        prompts.length = 0;
        const { task, question } = yield* setup;

        const { accepted } = yield* Operation.invoke(AssistantOperation.AnswerQuestion, {
          task,
          question: question.id,
          answer: '  ',
        });
        yield* Database.flush();

        expect(accepted).toBe(false);
        expect(task.history?.map(({ event }) => event)).toEqual(['question']);
        expect(yield* readEvents(Trace.QuestionAnswered)).toEqual([]);
        expect(prompts).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'still answers a question with no conversation to wake',
    Effect.fnUntraced(
      function* ({ expect }) {
        prompts.length = 0;
        const task = yield* Database.add(Task.make({ title: 'Pick one' }));
        const question = Task.ask(task, { text: 'Which one?' });
        yield* Database.flush();

        const { accepted, resumed } = yield* Operation.invoke(AssistantOperation.AnswerQuestion, {
          task,
          question: question.id,
          answer: 'The first',
        });
        yield* Database.flush();

        expect(accepted).toBe(true);
        // Nothing to wake, which is not a failure — the record is the point.
        expect(resumed).toBe(false);
        expect(answerOf(task, question.id)).toBe('The first');
        expect(prompts).toEqual([]);
      },
      Effect.provide(TestLayer),
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
