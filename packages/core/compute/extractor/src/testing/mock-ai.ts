//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

export interface MockResponse {
  /** Value returned by `LanguageModel.generateObject`. */
  readonly object?: unknown;
  /** Text returned by `LanguageModel.generateText`. */
  readonly text?: string;
}

/**
 * Test-only `AiService` layer whose model returns canned responses, so template/AI extractors
 * can be exercised without a live provider. `generateObject` resolves to `response.object`.
 */
export const mockAiService = (response: MockResponse): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: response.text ?? '', content: [] }),
        generateObject: () => Effect.succeed({ value: response.object, content: [] }),
        streamText: () => Stream.empty,
      } as any),
  });
