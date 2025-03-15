//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Cause, Chunk, Console, Effect, Exit, Fiber, Option, Scope, Stream } from 'effect';
import { describe, expect, test, type TaskContext } from 'vitest';

import { AIServiceClientImpl, OllamaClient, ToolTypes, type GenerationStreamEvent } from '@dxos/assistant';
import { log } from '@dxos/log';

import { NODE_INPUT, NODE_OUTPUT, registry, type GptInput } from '../nodes';
import { EdgeGpt } from '../services';
import { TestRuntime, testServices } from '../testing';
import { ComputeGraphModel, makeValueBag, unwrapValueBag, type ValueEffect } from '../types';

const ENABLE_LOGGING = true;
const SKIP_AI_SERVICE_TESTS = true;
const AI_SERVICE_ENDPOINT = 'http://localhost:8788';

describe('Gpt pipelines', () => {
  it.effect('text output', ({ expect }) =>
    Effect.gen(function* () {
      const runtime = new TestRuntime();
      runtime.registerGraph('dxn:compute:gpt1', gpt1());

      yield* Effect.gen(function* () {
        const scope = yield* Scope.make();
        const computeResult = yield* runtime
          .runGraph('dxn:compute:gpt1', makeValueBag({ prompt: 'What is the meaning of life?' }))
          .pipe(Scope.extend(scope), Effect.withSpan('runGraph'));

        const text: string = yield* computeResult.values.text;
        expect(text).toEqual('This is a mock response that simulates a GPT-like output.');

        yield* Scope.close(scope, Exit.void).pipe(Effect.withSpan('closeScope'));
      }).pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Effect.withSpan('test'));
    }),
  );

  test('stream output', { timeout: 1000 }, async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:compute:gpt2', gpt2());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();

        const output = yield* runtime
          .runGraph(
            'dxn:compute:gpt2',
            makeValueBag({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Scope.extend(scope));

        // log.info('text in test', { text: getDebugName(text) });
        const logger = Effect.runPromise(output.values.text).then((token) => {
          log.info('token', { token });
        });

        const tokenStream: Stream.Stream<GenerationStreamEvent> = yield* output.values.tokenStream;
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

        yield* Effect.promise(() => logger);
        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt output only', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:compute:gpt1', gpt1());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const computeResult = yield* runtime
          .runGraph(
            'dxn:compute:gpt1',
            makeValueBag({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(
            Effect.provide(
              testServices({
                enableLogging: ENABLE_LOGGING,
                gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT })),
              }),
            ),
            Scope.extend(scope),
          );

        const text: ValueEffect<string> = computeResult.values.text;
        const llmTextOutput = yield* text;
        log('llm', { llmTextOutput });
        expect(llmTextOutput.length).toBeGreaterThan(10);
        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt stream', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:compute:gpt2', gpt2());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const {
          tokenStream,
          text,
        }: { tokenStream: Stream.Stream<GenerationStreamEvent>; text: Effect.Effect<string> } = yield* runtime
          .runGraph(
            'dxn:compute:gpt2',
            makeValueBag({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(
            Effect.flatMap(unwrapValueBag),
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

  it.effect('gpt simple', (ctx) =>
    Effect.gen(function* () {
      if (!(yield* Effect.promise(() => OllamaClient.isRunning()))) {
        ctx!.skip();
        return;
      }

      const input: GptInput = {
        prompt: 'What is the meaning of life? Answer in 10 words or less.',
      };
      const output = yield* registry.gpt.exec!(makeValueBag(input)).pipe(
        Effect.flatMap(unwrapValueBag),
        Effect.provide(
          testServices({
            enableLogging: ENABLE_LOGGING,
            gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT })),
          }),
        ),
      );
      log.info('output', { output });
      expect(typeof output.text).toBe('string');
      expect(output.text.length).toBeGreaterThan(10);
    }).pipe(Effect.scoped),
  );

  test(
    'gpt with image gen',
    { timeout: 60_000 },
    testEffect((ctx) =>
      Effect.gen(function* () {
        if (!(yield* Effect.promise(() => OllamaClient.isRunning()))) {
          ctx!.skip();
          return;
        }

        const input: GptInput = {
          prompt: 'A beautiful sunset over a calm ocean',
          tools: [
            {
              name: 'text-to-image',
              type: ToolTypes.TextToImage,
              options: {
                model: '@testing/kitten-in-bubble',
              },
            },
          ],
        };
        const output = yield* registry.gpt.exec!(makeValueBag(input)).pipe(
          Effect.flatMap(unwrapValueBag),
          Effect.provide(
            testServices({
              enableLogging: ENABLE_LOGGING,
              gpt: new EdgeGpt(OllamaClient.createClient()),
            }),
          ),
        );
        log.info('output', { output });
        log.info('artifact', { artifact: output.artifact });
        expect(output.artifact).toBeDefined();
      }).pipe(Effect.scoped),
    ),
  );
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

// TODO(dmaretskyi): Bump vitest and @effect/vitest and remove this.
const testEffect =
  <E, A>(effect: (ctx?: TaskContext) => Effect.Effect<A, E>) =>
  (ctx?: TaskContext) =>
    Effect.gen(function* () {
      const exitFiber = yield* Effect.fork(Effect.exit(effect(ctx)));

      ctx?.onTestFinished(() => Fiber.interrupt(exitFiber).pipe(Effect.asVoid, Effect.runPromise));

      const exit = yield* Fiber.join(exitFiber);
      if (Exit.isSuccess(exit)) {
        return () => exit.value;
      } else {
        const errors = Cause.prettyErrors(exit.cause);
        for (let i = 1; i < errors.length; i++) {
          yield* Effect.logError(errors[i]);
        }
        return () => {
          throw errors[0];
        };
      }
    })
      .pipe(Effect.runPromise)
      .then((f) => f());
