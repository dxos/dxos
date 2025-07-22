//
// Copyright 2025 DXOS.org
//

import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { Effect, Layer } from 'effect';

import { AiModelNotAvailableError } from '../errors';
import { AiService } from '../service';

const LmStudioClient = OpenAiClient.layer({
  apiUrl: 'http://localhost:1234/v1',
});

// TODO(dmaretskyi): Make this generic.
export const AiServiceRouter = Layer.effect(
  AiService,
  Effect.gen(function* () {
    const anthropicClient = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);

    // TODO(dmaretskyi): If this is pushed into requirements this will conflict with the real OpenAiClient.
    const lmStudioClient = Layer.succeed(
      OpenAiClient.OpenAiClient,
      yield* OpenAiClient.OpenAiClient.pipe(Effect.provide(LmStudioClient)),
    );

    return AiService.of({
      model: (model) => {
        switch (model) {
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.model('claude-3-5-sonnet-20241022').pipe(Layer.provide(anthropicClient));
          case '@google/gemma-3-12b':
            // No standard model name.
            return OpenAiLanguageModel.model('google/gemma-3-12b' as any).pipe(Layer.provide(lmStudioClient));
          default:
            return Layer.fail(new AiModelNotAvailableError(model));
        }
      },
      get client(): never {
        throw new Error('Client not available');
      },
    });
  }),
);
