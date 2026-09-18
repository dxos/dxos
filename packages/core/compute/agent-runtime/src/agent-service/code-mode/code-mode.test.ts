//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { callTool } from '@dxos/ai';
import { LanguageModelFixture } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AssistantTestLayer } from '../../testing/index.ts';
import * as AgentService from '../AgentService.ts';
import { makeCodeModeTurnProducer } from './producer.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './sandbox.ts';

EntityId.dangerouslyDisableRandomness();

const TASK_TYPENAME = 'com.example.type.task';

class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({
    title: Schema.String.annotate({ description: 'Short title of the task.' }),
    status: Schema.String.annotate({ description: 'One of "open" or "done".' }),
    priority: Schema.optional(Schema.Number).annotate({ description: 'Priority score, higher is more urgent.' }),
  }),
) {}

/** Records every score the agent asked for, so a test can assert the operation ran from inside code. */
const scored: string[] = [];

const Score = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.score'),
    name: 'Score',
    description: 'Scores a task title for urgency, returning a number between 0 and 10.',
  },
  input: Schema.Struct({
    title: Schema.String.annotate({ description: 'The title to score' }),
  }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(
  Score.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ title }) {
        scored.push(title);
        // Deterministic, so the assertion is on what the agent did with the score, not on the score.
        return title.length;
      }),
    ),
  ),
);

const ScoreSkill = Skill.make({
  key: 'com.example.skill.score',
  name: 'Scoring',
  tools: Skill.toolDefinitions({ operations: [Score] }),
});

const TestLayer = AssistantTestLayer({
  types: [Task, Feed.Feed, Skill.Skill],
  operationHandlers: [handlers],
  skills: [ScoreSkill],
  agent: { makeTurnProducer: makeCodeModeTurnProducer() },
});

const seedTasks = Effect.fnUntraced(function* () {
  const tasks = [
    Obj.make(Task, { title: 'Write the docs', status: 'open' }),
    Obj.make(Task, { title: 'Fix the build', status: 'open' }),
    Obj.make(Task, { title: 'Ship the release', status: 'done' }),
  ];
  yield* Effect.forEach(tasks, (task) => Database.add(task));
  yield* Database.flush();
  return tasks;
});

const feedText = Effect.fnUntraced(function* (feed: Feed.Feed) {
  const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  return messages.map(Message.extractText).join('\n');
});

/** Runs `code` through the eval tool exactly as a turn would, returning what it printed. */
const runEval = Effect.fnUntraced(function* (code: string) {
  const runtime = yield* Effect.context<Database.Service>();
  const toolkit = makeEvalToolkit({
    runtime,
    operations: [
      {
        name: 'score',
        description: 'Scores a title',
        parameters: {},
        invoke: (input) => Effect.succeed((input as { title: string }).title.length),
      },
    ],
  });
  const result = yield* callTool(yield* toolkit.handlers, {
    _tag: 'toolCall',
    toolCallId: 'test',
    name: EVAL_TOOL_NAME,
    input: JSON.stringify({ code }),
    providerExecuted: false,
  });
  expect(result.error).toBeUndefined();
  return JSON.parse(String(result.result)).output as string;
});

describe('code mode', { tags: ['model-fixture'] }, () => {
  //
  // The sandbox itself, with no model in the loop.
  //

  it.effect(
    'the sandbox reads, writes and invokes operations',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();

        const output = yield* runEval(`
          const tasks = await query('${TASK_TYPENAME}', { status: 'open' });
          for (const task of tasks) {
            update(task, (task) => { task.priority = task.title.length; });
          }
          await flush();
          print('updated:', tasks.length);
        `);
        expect(output).toEqual('updated: 2');

        const created = yield* runEval(`
          const task = await make('${TASK_TYPENAME}', { title: 'Review the PR', status: 'open' });
          await add(task);
          await flush();
          const open = await query('${TASK_TYPENAME}', { status: 'open' });
          print('open:', open.length);
          print('scored:', await ops.score({ title: task.title }));
        `);
        expect(created).toEqual('open: 3\nscored: 13');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the sandbox reports a throw as output rather than failing the turn',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runEval("throw new Error('boom');");
        expect(output).toEqual('Error: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // The agent, running in code mode.
  //

  it.effect(
    'queries and changes objects by writing code',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt(
          `Every task of type ${TASK_TYPENAME} whose title mentions docs must be closed: set its status to "done". ` +
            'Then tell me how many tasks are done in total.',
        );
        yield* session.waitForCompletion();

        const tasks = yield* Database.query(Filter.type(Task)).run;
        const byTitle = new Map(tasks.map((task) => [task.title, task.status]));
        expect(byTitle.get('Write the docs')).toEqual('done');
        // The agent was asked to close one task, not to touch the rest.
        expect(byTitle.get('Fix the build')).toEqual('open');
        expect(yield* feedText(session.feed)).toContain('2');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : 30_000 },
  );

  it.effect(
    'invokes a skill operation from inside the sandbox',
    Effect.fnUntraced(
      function* (_) {
        scored.length = 0;
        yield* seedTasks();
        const session = yield* AgentService.createSession({ skills: [ScoreSkill] });
        yield* session.submitPrompt(
          `Score every open task of type ${TASK_TYPENAME} and store each score on the task's priority field. ` +
            'Then tell me which task scored highest.',
        );
        yield* session.waitForCompletion();

        // Which tasks were scored, not how many times: a model that re-runs its code to check the
        // result scores each one again, which is not the behaviour under test.
        expect([...new Set(scored)].toSorted()).toEqual(['Fix the build', 'Write the docs']);
        const tasks = yield* Database.query(Filter.type(Task)).run;
        const priorities = new Map(tasks.map((task) => [task.title, task.priority]));
        expect(priorities.get('Write the docs')).toEqual('Write the docs'.length);
        expect(priorities.get('Fix the build')).toEqual('Fix the build'.length);
        expect(yield* feedText(session.feed)).toContain('Write the docs');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : 30_000 },
  );
});
