//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { callTool } from '@dxos/ai';
import { LanguageModelFixture } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './eval-tool.ts';
import { makeCodeModeTurnProducer } from './producer.ts';
import * as Sandbox from './Sandbox.ts';

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
    // Says exactly what the handler does. An earlier version promised "a number between 0 and 10"
    // while returning the title's length, and both dialects spent their whole turn budget proving
    // the contradiction rather than writing data they had reason to distrust — correct of them, and
    // a bad fixture.
    description: "Scores a task title for urgency. Returns the title's length as the score.",
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

const testLayerOptions = {
  types: [Task, Feed.Feed, Skill.Skill],
  operationHandlers: [handlers],
  skills: [ScoreSkill],
};

const TestLayer = AssistantTestLayer({
  ...testLayerOptions,
  agent: { makeTurnProducer: makeCodeModeTurnProducer() },
});

/**
 * The agent scenarios run on every dialect: the turn loop is shared, so what differs between the
 * columns is only what the model made of the API it was given — which is the thing worth watching.
 */
const DIALECTS: { name: string; dialect: Dialect }[] = [
  { name: 'plain', dialect: PlainDialect },
  { name: 'effect', dialect: EffectDialect },
];

const agentTestLayer = (dialect: Dialect) =>
  AssistantTestLayer({
    ...testLayerOptions,
    agent: { makeTurnProducer: makeCodeModeTurnProducer({ dialect }) },
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

/** A typed failure for the effect dialect's error path — an Effect channel never carries a bare `Error`. */
class ProbeError extends Schema.TaggedError<ProbeError>('ProbeError')('ProbeError', {
  detail: Schema.String,
}) {}

/** The one operation the sandbox tests expose, standing in for a skill-bound tool. */
const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: 'Scores a title',
  parameters: {},
  // The real definition, so a dialect that hands the model the operation itself has one to bind.
  definition: Score,
  invoke: (input: unknown) => Effect.succeed((input as { title: string }).title.length),
};

/** How the effect dialect keys `ops`: by the operation's own DXN, not its derived tool name. */
const SCORE_KEY = String(Score.meta.key);

/** Runs `code` through the eval tool exactly as a turn would, returning what it printed. */
const runEval = Effect.fnUntraced(function* (code: string, dialect: Dialect = PlainDialect) {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  const toolkit = makeEvalToolkit({
    dialect: { ...dialect, bindings: (context) => ({ ...dialect.bindings(context), ProbeError }) },
    sandbox: Sandbox.inProcess,
    runtime,
    operations: [ScoreOperation],
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

  it.effect(
    'the effect dialect reads, writes and invokes operations through the ECHO API',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();

        const output = yield* runEval(
          `
          const tasks = yield* Database.query(Filter.type(types['${TASK_TYPENAME}'], { status: 'open' })).run;
          yield* print('open', tasks.length);
          for (const task of tasks) {
            Obj.update(task, (task) => { task.priority = task.title.length; });
          }
          const created = yield* Database.add(Obj.make(types['${TASK_TYPENAME}'], { title: 'Review the PR', status: 'open' }));
          yield* Database.flush();
          yield* print('created', created.title);
          yield* print('scored', yield* Operation.invoke(ops['${SCORE_KEY}'], { title: created.title }));
        `,
          EffectDialect,
        );

        expect(output).toEqual('open 2\ncreated Review the PR\nscored 13');
        const tasks = yield* Database.query(Filter.type(Task)).run;
        expect(tasks.find((task) => task.title === 'Write the docs')?.priority).toEqual('Write the docs'.length);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failing effect in the effect dialect is reported as output',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runEval("yield* Effect.fail(new ProbeError({ detail: 'nope' }));", EffectDialect);
        expect(output).toContain('Error:');
        expect(output).toContain('nope');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the sandbox abandons an evaluation that outruns its timeout',
    Effect.fnUntraced(
      function* (_) {
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const result = yield* Sandbox.inProcess
          .evaluate({
            code: 'await new Promise(() => {});',
            // Nothing is bound: what is under test is the bound, not the API.
            dialect: { ...PlainDialect, bindings: () => ({}) },
            context: { runtime, operations: [], print: () => {} },
            timeout: '20 millis',
          })
          .pipe(Effect.result);

        expect(Result.isFailure(result)).toBe(true);
        expect(Result.isFailure(result) && result.failure.message).toContain('abandoned');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // The agent, running in code mode — every dialect, same scenarios, same assertions.
  //

  describe.each(DIALECTS)('$name dialect', ({ dialect }) => {
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
        Effect.provide(agentTestLayer(dialect)),
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

          // That each open task was scored, not that nothing else was: the model is free to re-run
          // its code, or to probe the operation with inputs of its own, neither of which is the
          // behaviour under test.
          expect(scored).toContain('Write the docs');
          expect(scored).toContain('Fix the build');
          const tasks = yield* Database.query(Filter.type(Task)).run;
          const priorities = new Map(tasks.map((task) => [task.title, task.priority]));
          expect(priorities.get('Write the docs')).toEqual('Write the docs'.length);
          expect(priorities.get('Fix the build')).toEqual('Fix the build'.length);
          expect(yield* feedText(session.feed)).toContain('Write the docs');
        },
        Effect.provide(agentTestLayer(dialect)),
        TestHelpers.provideTestContext,
      ),
      { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : 30_000 },
    );
  });
});
