import { AIServiceClientImpl, type ResultStreamEvent } from '@dxos/assistant';
import { GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';
import { getDebugName } from '@dxos/util';
import { Chunk, Console, Effect, Exit, Option, Scope, Stream } from 'effect';
import { describe, test } from 'vitest';
import { NodeType, type ComputeEdge, type ComputeGraph, type ComputeNode } from '../schema';
import { createEdge, TestRuntime } from '../testing';
import { testServices } from '../testing/test-services';
import { EdgeGpt } from '../services/gpt/edge-gpt';

const ENABLE_LOGGING = false;
const AI_SERVICE_ENDPOINT = 'http://localhost:8787';
const SKIP_AI_SERVICE_TESTS = true;

describe('Gpt pipelines', () => {
  test('text output', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt1', gpt1());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();

        const computeResult = runtime
          .runGraph('dxn:graph:gpt1', {
            prompt: 'What is the meaning of life?',
          })
          .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Scope.extend(scope));

        const { text }: { text: Effect.Effect<string, Error, never> } = yield* computeResult;

        expect(yield* text).toEqual('This is a mock response that simulates a GPT-like output.');

        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test('stream output', { timeout: 1000 }, async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt2', gpt2());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();

        const { tokenStream, text }: { tokenStream: Stream.Stream<ResultStreamEvent>; text: Effect.Effect<string> } =
          yield* runtime
            .runGraph('dxn:graph:gpt2', {
              prompt: 'What is the meaning of life?',
            })
            .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Scope.extend(scope));

        log.info('text in test', { text: getDebugName(text) });

        const p = Effect.runPromise(text).then((x) => {
          console.log({ x });
        });

        const tokens = yield* tokenStream.pipe(
          Stream.filterMap((ev) =>
            ev.type === 'content_block_delta' && ev.delta.type === 'text_delta'
              ? Option.some(ev.delta.text)
              : Option.none(),
          ),
          Stream.tap((token) => Console.log(token)),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );

        expect(tokens).toEqual([
          'This',
          ' ',
          'is',
          ' ',
          'a',
          ' ',
          'mock',
          ' ',
          'response',
          ' ',
          'that',
          ' ',
          'simulates',
          ' ',
          'a',
          ' ',
          'GPT-like',
          ' ',
          'output',
          '.',
          '',
        ]);

        yield* Effect.promise(() => p);

        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt output only', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt1', gpt1());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();

        const computeResult = runtime
          .runGraph('dxn:graph:gpt1', {
            prompt: 'What is the meaning of life?',
          })
          .pipe(
            Effect.provide(
              testServices({
                enableLogging: ENABLE_LOGGING,
                gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT })),
              }),
            ),
            Scope.extend(scope),
          );

        const { text }: { text: Effect.Effect<string, Error, never> } = yield* computeResult;

        const llmTextOutput = yield* text;
        console.log({ llmTextOutput });
        expect(llmTextOutput.length).toBeGreaterThan(10);

        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt stream', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt2', gpt2());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();

        const { tokenStream, text }: { tokenStream: Stream.Stream<ResultStreamEvent>; text: Effect.Effect<string> } =
          yield* runtime
            .runGraph('dxn:graph:gpt2', {
              prompt: 'What is the meaning of life?',
            })
            .pipe(
              Effect.provide(
                testServices({
                  enableLogging: ENABLE_LOGGING,
                  gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT })),
                }),
              ),
              Scope.extend(scope),
            );

        // log.info('text in test', { text: getDebugName(text) });

        const p = Effect.runPromise(text).then((x) => {
          console.log({ x });
        });

        const tokens = yield* tokenStream.pipe(
          Stream.filterMap((ev) =>
            ev.type === 'content_block_delta' && ev.delta.type === 'text_delta'
              ? Option.some(ev.delta.text)
              : Option.none(),
          ),
          Stream.tap((token) => Console.log(token)),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );

        expect(tokens.length).toBeGreaterThan(2);

        yield* Effect.promise(() => p);

        yield* Scope.close(scope, Exit.void);
      }),
    );
  });
});

const gpt1 = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'gpt1-INPUT', data: { type: NodeType.Input } })
    .addNode({ id: 'gpt1-GPT', data: { type: NodeType.Gpt } })
    .addNode({ id: 'gpt1-OUTPUT', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'gpt1-INPUT', output: 'prompt', target: 'gpt1-GPT', input: 'prompt' }))
    .addEdge(createEdge({ source: 'gpt1-GPT', output: 'text', target: 'gpt1-OUTPUT', input: 'text' }));
};

const gpt2 = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'gpt2-INPUT', data: { type: NodeType.Input } })
    .addNode({ id: 'gpt2-GPT', data: { type: NodeType.Gpt } })
    .addNode({ id: 'gpt2-OUTPUT', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'gpt2-INPUT', output: 'prompt', target: 'gpt2-GPT', input: 'prompt' }))
    .addEdge(createEdge({ source: 'gpt2-GPT', output: 'text', target: 'gpt2-OUTPUT', input: 'text' }))
    .addEdge(createEdge({ source: 'gpt2-GPT', output: 'tokenStream', target: 'gpt2-OUTPUT', input: 'tokenStream' }));
};
