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
import { DEFAULT_MAX_OUTPUT, EVAL_TOOL_NAME, evaluate, makeEvalToolkit } from './eval-tool.ts';
import { makeCodeModeTurnProducer } from './producer.ts';
import * as Sandbox from './Sandbox.ts';

EntityId.dangerouslyDisableRandomness();

const TASK_TYPENAME = 'com.example.type.task';

/** The versioned DXN the effect dialect resolves the type by. */
const TASK_DXN = String(DXN.make(TASK_TYPENAME, '0.1.0'));

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
  // The real definition, so a dialect that hands the model the operation itself has one to resolve.
  definition: Score,
  invoke: (input: unknown) => Effect.succeed((input as { title: string }).title.length),
};

/** The DXN the effect dialect resolves the operation by, not its derived tool name. */
const SCORE_KEY = String(Score.meta.key);

/** Runs `code` through the eval tool exactly as a turn would: what the model is shown, and whether the call failed. */
const runEvalResult = Effect.fnUntraced(function* (code: string, dialect: Dialect = PlainDialect) {
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
  if (result.error !== undefined) {
    expect(result.result).toBeUndefined();
    return { output: result.error, ok: false };
  }
  return { output: Schema.decodeUnknownSync(Schema.String)(JSON.parse(String(result.result))), ok: true };
});

/** Runs `code` through the eval tool exactly as a turn would, returning what it printed. */
const runEval = (code: string, dialect: Dialect = PlainDialect) =>
  runEvalResult(code, dialect).pipe(Effect.map(({ output }) => output));

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
    'evaluate answers with the text the eval tool returns',
    Effect.fnUntraced(
      function* (_) {
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const run = (code: string) =>
          evaluate({ code, dialect: PlainDialect, sandbox: Sandbox.inProcess, runtime, operations: [ScoreOperation] });

        const code = "print('scored', await ops.score({ title: 'abc' }));";
        expect(yield* run(code)).toEqual((yield* runEvalResult(code)).output);

        const failing = "print('before'); throw new Error('boom');";
        const failure = yield* run(failing).pipe(Effect.flip);
        expect(failure).toEqual((yield* runEvalResult(failing)).output);
        expect(failure).toEqual('before\nError: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the sandbox returns printed output as plain text',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult("print('one'); print('two', { three: 3 });");
        expect(ok).toBe(true);
        expect(output).toEqual('one\ntwo {\n  "three": 3\n}');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the sandbox reports a throw as a failed tool call rather than failing the turn',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult("throw new Error('boom');");
        expect(ok).toBe(false);
        expect(output).toEqual('Error: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failed tool call carries everything printed before the throw',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult("print('first'); print('second'); throw new Error('boom');");
        expect(ok).toBe(false);
        expect(output).toEqual('first\nsecond\nError: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a thrown string fails the tool call with that string',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult("print('before'); throw 'oops';");
        expect(ok).toBe(false);
        expect(output).toEqual('before\nError: oops');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the sandbox caps its output and tells the model it did',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult(`print('x'.repeat(${DEFAULT_MAX_OUTPUT + 1_000}));`);
        expect(ok).toBe(true);
        expect(output).toContain(`capped at ${DEFAULT_MAX_OUTPUT} characters`);
        expect(output.length).toBeLessThan(DEFAULT_MAX_OUTPUT + 500);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failure is reported even after the output budget is spent',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult(
          `print('x'.repeat(${DEFAULT_MAX_OUTPUT + 1_000})); throw new Error('boom');`,
        );
        expect(ok).toBe(false);
        expect(output.endsWith('Error: boom')).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'yielding something that is not an effect points at Database.load',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult('yield* Promise.resolve(1);', EffectDialect);
        expect(ok).toBe(false);
        expect(output).toContain('is not iterable');
        expect(output).toContain('yield* Database.load(ref)');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the effect dialect binds DOCS as a plain object of markdown',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runEval(
          "yield* print(Object.keys(DOCS).join(',')); yield* print(DOCS['README.md'].slice(0, 28));",
          EffectDialect,
        );
        expect(output).toEqual(
          'README.md,database.md,queries.md,operations.md,errors.md,catalog/types.md,catalog/operations.md\n' +
            '# Code mode (Effect dialect)',
        );
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "the README's recipe lists every type and operation key from the catalog",
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runEval(
          `
          const typeKeys = DOCS['catalog/types.md'].match(/dxn:[^\\s\`]+/g);
          const operationKeys = DOCS['catalog/operations.md'].match(/dxn:[^\\s\`']+/g) ?? [];
          yield* print(typeKeys.includes('${TASK_DXN}'), operationKeys.join(','));
          const Score = yield* Database.resolve(operationKeys[0]);
          yield* print('scored', yield* Operation.invoke(Score, { title: 'abc' }));
        `,
          EffectDialect,
        );
        expect(output).toEqual(`true ${SCORE_KEY}\nscored 3`);
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
          const tasks = yield* Database.query(Filter.type((yield* Database.resolve('${TASK_DXN}')), { status: 'open' })).run;
          yield* print('open', tasks.length);
          for (const task of tasks) {
            Obj.update(task, (task) => { task.priority = task.title.length; });
          }
          const created = yield* Database.add(Obj.make((yield* Database.resolve('${TASK_DXN}')), { title: 'Review the PR', status: 'open' }));
          yield* Database.flush();
          yield* print('created', created.title);
          yield* print('scored', yield* Operation.invoke((yield* Database.resolve('${SCORE_KEY}')), { title: created.title }));
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
    'a failing effect in the effect dialect fails the tool call after its output',
    Effect.fnUntraced(
      function* (_) {
        const { output, ok } = yield* runEvalResult(
          "yield* print('before'); yield* Effect.fail(new ProbeError({ detail: 'nope' }));",
          EffectDialect,
        );
        expect(ok).toBe(false);
        expect(output.startsWith('before\nError:')).toBe(true);
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

          // The call reaches the feed labelled after the operation its code invoked, still an eval.
          const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
          const calls = messages.flatMap((message) =>
            message.blocks.filter((block) => block._tag === 'toolCall' && block.name === EVAL_TOOL_NAME),
          );
          expect(calls).toContainEqual(expect.objectContaining({ displayName: 'Score' }));
          expect(calls.every((call) => !('operationName' in call))).toBe(true);
        },
        Effect.provide(agentTestLayer(dialect)),
        TestHelpers.provideTestContext,
      ),
      { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : 30_000 },
    );
  });
});
