//
// Copyright 2025 DXOS.org
//

import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { Effect, Layer } from 'effect';

import { AiModelNotAvailableError } from '../errors';
import { AiService } from '../service';

// TODO(dmaretskyi): Make this generic.
export const AiServiceRouter = Layer.effect(
  AiService,
  Effect.gen(function* () {
    const anthropicClient = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);

    return AiService.of({
      model: (model) => {
        switch (model) {
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.model('claude-3-5-sonnet-20241022').pipe(Layer.provide(anthropicClient));
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
