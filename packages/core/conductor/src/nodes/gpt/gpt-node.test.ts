import { describe, expect, it, test, type TaskContext } from '@effect/vitest';
import { Cause, Effect, Exit, Fiber } from 'effect';

import { defineTool, OllamaAiServiceClient, ToolTypes } from '@dxos/ai';

import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { ValueBag } from '../../types';
import { GptInput, gptNode } from './node';

const ENABLE_LOGGING = true;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('gptNode', () => {
  it.effect('gpt simple', (ctx) =>
    Effect.gen(function* () {
      if (!(yield* Effect.promise(() => OllamaAiServiceClient.isRunning()))) {
        ctx!.skip();
        return;
      }

      const input: GptInput = {
        prompt: 'What is the meaning of life? Answer in 10 words or less.',
      };
      const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
        Effect.flatMap(ValueBag.unwrap),
        Effect.provide(
          createTestServices({
            ai: {
              provider: 'dev',
            },
            logging: {
              enabled: ENABLE_LOGGING,
            },
          }).createLayer(),
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
        if (!(yield* Effect.promise(() => OllamaAiServiceClient.isRunning()))) {
          ctx!.skip();
          return;
        }

        const input: GptInput = {
          prompt: 'A beautiful sunset over a calm ocean',
          tools: [
            defineTool('testing', {
              name: 'text-to-image',
              type: ToolTypes.TextToImage,
              options: {
                model: '@testing/kitten-in-bubble',
              },
            }),
          ],
        };
        const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
          Effect.flatMap(ValueBag.unwrap),
          Effect.provide(
            createTestServices({
              ai: {
                provider: 'ollama',
              },
              logging: {
                enabled: ENABLE_LOGGING,
              },
            }).createLayer(),
          ),
        );
        log.info('output', { output });
        log.info('artifact', { artifact: output.artifact });
        expect(output.artifact).toBeDefined();
      }).pipe(Effect.scoped),
    ),
  );
});

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
      .then((fn) => fn());
