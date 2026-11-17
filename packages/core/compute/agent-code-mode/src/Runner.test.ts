//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { callTool } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import type { Database } from '@dxos/echo';
import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, type Evaluation, makeEvalToolkit } from './eval-tool.ts';
import * as Runner from './Runner.ts';
import * as Sandbox from './Sandbox.ts';

const Score = Operation.make({
  meta: { key: DXN.make('com.example.operation.score'), name: 'Score', description: "A title's length." },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(
  Score.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ title }) {
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
  types: [Feed.Feed, Skill.Skill],
  operationHandlers: [handlers],
  skills: [ScoreSkill],
});

/** Decodes the sandbox's untyped argument against the operation's own input schema. */
const decodeScoreInput = Schema.decodeUnknownSync(Schema.toType(Score.input));

/** The one operation the scripts below call, projected as the sandbox sees it. */
const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: Score.meta.description,
  parameters: {},
  // The real definition, so the effect dialect — which hands the model the operation itself — can resolve it.
  definition: Score,
  invoke: (input: unknown) => Effect.succeed(decodeScoreInput(input).title.length),
};

const runner = Effect.fnUntraced(function* () {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  return Runner.make({ sandbox: Sandbox.inProcess, runtime, operations: [ScoreOperation] });
});

describe('code-mode script runner', () => {
  it.effect(
    'runs an inline snippet in each dialect it serves',
    Effect.fnUntraced(
      function* (_) {
        const run = yield* runner();
        const plain = yield* run.run({
          source: Operation.inlineScript("print('scored', await ops.score({ title: 'abc' }));", { dialect: 'plain' }),
        });
        expect(plain.output).toBe('scored 3');
        expect(plain.error).toBeUndefined();

        const effect = yield* run.run({
          source: Operation.inlineScript(
            `yield* print('scored', yield* Operation.invoke(yield* Database.resolve('${String(Score.meta.key)}'), { title: 'abcd' }));`,
            { dialect: 'effect' },
          ),
        });
        expect(effect.output).toBe('scored 4');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "reports the script's own failure as a result, not as a failed call",
    Effect.fnUntraced(
      function* (_) {
        const run = yield* runner();
        const result = yield* run.run({
          source: Operation.inlineScript("print('before'); throw new Error('boom');", { dialect: 'plain' }),
        });
        expect(result.output).toBe('before\nError: boom');
        expect(result.error).toBe('Error: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'fails a dialect code mode does not serve',
    Effect.fnUntraced(
      function* (_) {
        const run = yield* runner();
        const error = yield* run
          .run({ source: Operation.inlineScript('const x = 1;', { dialect: 'typescript' }) })
          .pipe(Effect.flip);
        expect(error._tag).toBe('ScriptError');
        expect(error.message).toContain('typescript');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'honours the request timeout over the runner default',
    Effect.fnUntraced(
      function* (_) {
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const run = Runner.make({ sandbox: Sandbox.inProcess, runtime, operations: [] });
        const result = yield* run.run({
          source: Operation.inlineScript('await new Promise(() => {});', { dialect: 'plain' }),
          timeoutMs: 20,
        });
        expect(result.error).toContain('abandoned');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "serves exactly the dialects code mode has, and takes a script operation's own source",
    Effect.fnUntraced(
      function* (_) {
        expect(Runner.DIALECTS.plain).toBe(PlainDialect);
        expect(Runner.DIALECTS.effect).toBe(EffectDialect);
        expect(Runner.DIALECTS.typescript).toBeUndefined();

        const operation = Operation.makeScript({
          meta: { key: DXN.make('com.example.script') },
          source: Operation.inlineScript("print('from an operation');", { dialect: 'plain' }),
        });
        const run = yield* runner();
        expect((yield* run.run(Operation.scriptRequest(operation))).output).toBe('from an operation');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'evaluates in whichever sandbox it is given, which is what links the worker and workerd backends',
    Effect.fnUntraced(
      function* (_) {
        const seen: string[] = [];
        // Stands in for `WorkerSandbox`/`WorkerdSandbox`: the runner's contract with a sandbox is the
        // wrapped code and the dialect, and neither depends on where that sandbox runs it.
        const recording: Sandbox.Sandbox = {
          evaluate: ({ code, dialect }) =>
            Effect.sync(() => {
              seen.push(`${dialect.name}:${code.includes("print('x')")}`);
              return undefined;
            }),
        };
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const run = Runner.make({ sandbox: recording, runtime, operations: [] });
        yield* run.run({ source: Operation.inlineScript("print('x')", { dialect: 'plain' }) });
        expect(seen).toEqual(['plain:true']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an eval call answered through a runner still reports which call it was and what it ran',
    Effect.fnUntraced(
      function* (_) {
        const runtime = yield* Effect.context<Database.Service | Operation.Service>();
        const evaluations: Evaluation[] = [];
        const base = {
          dialect: PlainDialect,
          sandbox: Sandbox.inProcess,
          runtime,
          operations: [ScoreOperation],
          onEvaluated: (evaluation: Evaluation) => evaluations.push(evaluation),
        };
        // As the producer builds it: one runner per call, so the evaluation carries the call's id.
        const toolkit = makeEvalToolkit({
          ...base,
          runner: ({ toolCallId }) => Runner.make({ ...base, dialects: { plain: PlainDialect }, toolCallId }),
        });
        const result = yield* callTool(yield* toolkit.handlers, {
          _tag: 'toolCall',
          toolCallId: 'call-1',
          name: EVAL_TOOL_NAME,
          input: JSON.stringify({ code: "print(await ops.score({ title: 'abc' }));" }),
          providerExecuted: false,
        });
        expect(result.error).toBeUndefined();
        expect(evaluations.map(({ toolCallId, invocations }) => ({ toolCallId, invocations }))).toEqual([
          { toolCallId: 'call-1', invocations: [{ operationKey: String(Score.meta.key) }] },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
