//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { getModel } from '../../defs';
import { AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.resolver(
    {
      name: 'Anthropic',
    },

    Effect.gen(function* () {
      const clientLayer = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);
      const max_tokens = 16_384;
      return (model, options): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never> => {
        // Edge models are served by Anthropic; the catalog supplies the back-end name and which
        // models use adaptive thinking (Opus).
        const info = getModel(model);
        if (info?.source !== 'edge') {
          return Layer.fail(new AiModelNotAvailableError(model));
        }
        const thinking =
          info.thinking && (options?.thinking ?? true) ? ({ type: 'adaptive' as any } as const) : undefined;
        return AnthropicLanguageModel.layer({ model: info.backend, config: { thinking, max_tokens } }).pipe(
          Layer.provide(clientLayer),
        );
      };
    }),
  );
