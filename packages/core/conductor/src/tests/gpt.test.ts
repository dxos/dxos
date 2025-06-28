//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Chunk, Console, Effect, Exit, Option, Scope, Stream } from 'effect';
import { describe, test } from 'vitest';

import { type GenerationStreamEvent } from '@dxos/ai';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import { TestRuntime } from '../testing';
import { ComputeGraphModel, ValueBag, type ValueEffect } from '../types';

const ENABLE_LOGGING = true;
const SKIP_AI_SERVICE_TESTS = true;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('GPT pipelines', () => {
  it.effect('text output', ({ expect }) =>
    Effect.gen(function* () {
      const runtime = new TestRuntime(createTestServices({ logging: { enabled: ENABLE_LOGGING } }));
      runtime.registerGraph('dxn:compute:gpt1', gpt1());

      yield* Effect.gen(function* () {
        const scope = yield* Scope.make();
        const computeResult = yield* runtime
          .runGraph('dxn:compute:gpt1', ValueBag.make({ prompt: 'What is the meaning of life?' }))
          .pipe(Scope.extend(scope), Effect.withSpan('runGraph'));

        const text: string = yield* computeResult.values.text;
        expect(text).toEqual('This is a mock response that simulates a GPT-like output.');

        yield* Scope.close(scope, Exit.void).pipe(Effect.withSpan('closeScope'));
      }).pipe(Effect.withSpan('test'));
    }),
  );

  test('stream output', { timeout: 1000 }, async ({ expect }) => {
    const runtime = new TestRuntime(createTestServices({ logging: { enabled: ENABLE_LOGGING } }));
    runtime.registerGraph('dxn:compute:gpt2', gpt2());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const output = yield* runtime
          .runGraph(
            'dxn:compute:gpt2',
            ValueBag.make({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(Scope.extend(scope));

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
    const runtime = new TestRuntime(
      createTestServices({
        ai: {
          provider: 'dev',
        },
        logging: {
          enabled: ENABLE_LOGGING,
        },
      }),
    );
    runtime.registerGraph('dxn:compute:gpt1', gpt1());

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const computeResult = yield* runtime
          .runGraph(
            'dxn:compute:gpt1',
            ValueBag.make({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(Scope.extend(scope));

        const text: ValueEffect<string> = computeResult.values.text;
        const llmTextOutput = yield* text;
        log('llm', { llmTextOutput });
        expect(llmTextOutput.length).toBeGreaterThan(10);
        yield* Scope.close(scope, Exit.void);
      }),
    );
  });

  test.skipIf(SKIP_AI_SERVICE_TESTS)('edge gpt stream', async ({ expect }) => {
    const runtime = new TestRuntime(
      createTestServices({
        logging: {
          enabled: ENABLE_LOGGING,
        },
        ai: {
          provider: 'dev',
        },
      }),
    );
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
            ValueBag.make({
              prompt: 'What is the meaning of life?',
            }),
          )
          .pipe(Effect.flatMap(ValueBag.unwrap), Scope.extend(scope));

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
