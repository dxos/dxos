//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

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
