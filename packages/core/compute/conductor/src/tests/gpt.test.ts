//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { Operation, Trace } from '@dxos/compute';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { configuredCredentialsLayer } from '@dxos/functions';
import { URI } from '@dxos/keys';

import { type GptOutput, NODE_INPUT, NODE_OUTPUT } from '../nodes';
import { TestRuntime } from '../testing';
import { DEFAULT_OUTPUT, ComputeGraphModel, ValueBag } from '../types';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.succeed(Operation.Service, {
        invoke: () => Effect.die('Operation.Service not available in test.'),
        schedule: () => Effect.die('Operation.Service not available in test.'),
        invokePromise: async () => ({ error: new Error('Not available') }),
      } as any),
      registryLayerNoop,
    ),
  ),
  Layer.provideMerge(
    Layer.mergeAll(TestAiService(), TestDatabaseLayer(), configuredCredentialsLayer([]), Trace.writerLayerNoop),
  ),
);

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('GPT pipelines', () => {
  it.scoped(
    'text output',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime();
        runtime.registerGraph(URI.make('dxn:compute:gpt1'), gpt1());

        const computeResult = yield* runtime
          .runGraph(URI.make('dxn:compute:gpt1'), ValueBag.make({ prompt: 'What is the meaning of life?' }))
          .pipe(Effect.withSpan('runGraph'));

        const text: string = yield* computeResult.values.text;
        // Content-sensitive: the GPT output addresses the prompt. The memoized conversation is keyed on the
        // full prompt, so a broken prompt->GPT wiring would also fail to match a fixture.
        expect(text.toLowerCase()).toContain('life');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // (Template + Chat) ==(systemPrompt + prompt)==> GPT ===> output.
  // The chat input maps to the graph input node in headless execution; the template supplies the system prompt.
  it.scoped(
    'template system prompt + chat prompt -> gpt -> output',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime();
        runtime.registerGraph(URI.make('dxn:compute:template-gpt'), templateGpt());

        const computeResult = yield* runtime
          .runGraph(URI.make('dxn:compute:template-gpt'), ValueBag.make({ prompt: 'What is the meaning of life?' }))
          .pipe(Effect.withSpan('runGraph'));

        const text: string = yield* computeResult.values.text;
        // Content-sensitive: the GPT output addresses the prompt. The template feeds `systemPrompt`, which is
        // part of the memoized conversation key — if that edge were dropped the prompt would no longer match a
        // recorded fixture and this test would fail, so a passing match exercises the template->GPT wiring.
        expect(text.toLowerCase()).toContain('life');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'stream output',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime();
        runtime.registerGraph(URI.make('dxn:compute:gpt2'), gpt2());

        const output: ValueBag<GptOutput> = yield* runtime.runGraph(
          URI.make('dxn:compute:gpt2'),
          ValueBag.make({
            prompt: 'What is the meaning of life?',
          }),
        );

        // Drain the token stream and drive generation concurrently. The GPT node shuts the token
        // pubsub down once generation completes, so the stream terminates (previously it hung forever).
        const [tokens, text] = yield* Effect.all(
          [
            Effect.flatMap(output.values.tokenStream, (tokenStream) =>
              tokenStream.pipe(
                Stream.filterMap((part) => (part.type === 'text-delta' ? Option.some(part.delta) : Option.none())),
                Stream.runCollect,
                Effect.map(Chunk.toArray),
              ),
            ),
            output.values.text,
          ],
          { concurrency: 'unbounded' },
        );

        expect(Array.isArray(tokens)).toBe(true);
        expect(text.length).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  // TODO(burdon): Update these tests to use TestLayer when re-enabling.
  // test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt output only', async ({ expect }) => {
  //   const runtime = new TestRuntime();
  //   runtime.registerGraph(URI.make('dxn:compute:gpt1'), gpt1());
  //
  //   await EffectEx.runAndForwardErrors(
  //     Effect.gen(function* () {
  //       const scope = yield* Scope.make();
  //       const computeResult = yield* runtime
  //         .runGraph(
  //           URI.make('dxn:compute:gpt1'),
  //           ValueBag.make({
  //             prompt: 'What is the meaning of life?',
  //           }),
  //         )
  //         .pipe(Scope.extend(scope));
  //
  //       const text: ValueEffect<string> = computeResult.values.text;
  //       const llmTextOutput = yield* text;
  //       log('llm', { llmTextOutput });
  //       expect(llmTextOutput.length).toBeGreaterThan(10);
  //       yield* Scope.close(scope, Exit.void);
  //     }),
  //   );
  // });
  //
  // test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt stream', async ({ expect }) => {
  //   const runtime = new TestRuntime();
  //   runtime.registerGraph(URI.make('dxn:compute:gpt2'), gpt2());
  //
  //   await EffectEx.runAndForwardErrors(
  //     Effect.gen(function* () {
  //       const scope = yield* Scope.make();
  //       const outputs: ValueBag<GptOutput> = yield* runtime
  //         .runGraph(
  //           URI.make('dxn:compute:gpt2'),
  //           ValueBag.make({
  //             prompt: 'What is the meaning of life?',
  //           }),
  //         )
  //         .pipe(Scope.extend(scope));
  //
  //       // log.info('text in test', { text: getDebugName(text) });
  //
  //       const p = EffectEx.runAndForwardErrors(outputs.values.text).then((x) => {
  //         console.log({ x });
  //       });
  //
  //       const tokens = yield* outputs.values.tokenStream.pipe(
  //         Stream.unwrap,
  //         Stream.filterMap((part) => (part.type === 'text-delta' ? Option.some(part.delta) : Option.none())),
  //         Stream.tap((token) => Console.log(token)),
  //         Stream.runCollect,
  //         Effect.map(Chunk.toArray),
  //       );
  //
  //       expect(tokens.length).toBeGreaterThan(2);
  //
  //       yield* Effect.promise(() => p);
  //       yield* Scope.close(scope, Exit.void);
  //     }),
  //   );
  // });
});
const gpt1 = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'gpt1-INPUT', type: NODE_INPUT })
    .createNode({ id: 'gpt1-GPT', type: 'gpt' })
    .createNode({ id: 'gpt1-OUTPUT', type: NODE_OUTPUT })
    .createEdge({ node: 'gpt1-INPUT', property: 'prompt' }, { node: 'gpt1-GPT', property: 'prompt' })
    .createEdge({ node: 'gpt1-GPT', property: 'text' }, { node: 'gpt1-OUTPUT', property: 'text' });

  return model;
};

const templateGpt = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'tg-INPUT', type: NODE_INPUT })
    .createNode({
      id: 'tg-TEMPLATE',
      type: 'template',
      valueType: 'string',
      value: 'You are a helpful assistant. Always reply concisely.',
    })
    .createNode({ id: 'tg-GPT', type: 'gpt' })
    .createNode({ id: 'tg-OUTPUT', type: NODE_OUTPUT })
    .createEdge({ node: 'tg-INPUT', property: 'prompt' }, { node: 'tg-GPT', property: 'prompt' })
    .createEdge({ node: 'tg-TEMPLATE', property: DEFAULT_OUTPUT }, { node: 'tg-GPT', property: 'systemPrompt' })
    .createEdge({ node: 'tg-GPT', property: 'text' }, { node: 'tg-OUTPUT', property: 'text' });

  return model;
};

const gpt2 = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'gpt2-INPUT', type: NODE_INPUT })
    .createNode({ id: 'gpt2-GPT', type: 'gpt' })
    .createNode({ id: 'gpt2-OUTPUT', type: NODE_OUTPUT })
    .createEdge({ node: 'gpt2-INPUT', property: 'prompt' }, { node: 'gpt2-GPT', property: 'prompt' })
    .createEdge({ node: 'gpt2-GPT', property: 'text' }, { node: 'gpt2-OUTPUT', property: 'text' })
    .createEdge({ node: 'gpt2-GPT', property: 'tokenStream' }, { node: 'gpt2-OUTPUT', property: 'tokenStream' });

  return model;
};
