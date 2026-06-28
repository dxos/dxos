//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

export * from './harness/serialize';
export * from './harness/generate-facts';

/** Minimal `AiService` whose `generateObject` returns a fixed object (no network). */
export const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: () => Effect.succeed({ value: object, content: [] }),
        streamText: () => Stream.empty,
      } as any),
  });

/** `AiService` whose `generateObject` fails, exercising the recoverable extraction error path. */
export const failingAiService = (): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.fail(new Error('boom')),
        generateObject: () => Effect.fail(new Error('boom')),
        streamText: () => Stream.fail(new Error('boom')),
      } as any),
  });

/** Stub `AiService` that returns a different `generateObject` payload per call (FIFO),
 *  simulating per-message LLM extraction over a sequence of documents. */
export const queuedAiService = (payloads: readonly unknown[]): Layer.Layer<AiService.AiService> => {
  let index = 0;
  return Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: () => Effect.succeed({ value: payloads[index++], content: [] }),
        streamText: () => Stream.empty,
      } as any),
  });
};

/** Mock `AiService` that counts `generateObject` invocations (for incrementality tests). */
export const countingAiService = (
  object: unknown,
): { layer: Layer.Layer<AiService.AiService>; calls: () => number } => {
  let calls = 0;
  const layer = Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: () => {
          calls += 1;
          return Effect.succeed({ value: object, content: [] });
        },
        streamText: () => Stream.empty,
      } as any),
  });
  return { layer, calls: () => calls };
};
