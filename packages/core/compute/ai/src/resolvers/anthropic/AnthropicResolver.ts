//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import * as AiModelResolver from '../../AiModelResolver';
import { AiModelNotAvailableError } from '../../errors';
import * as Model from '../../Model';
import * as Provider from '../../Provider';

export const make = () =>
  AiModelResolver.resolver(
    {
      name: 'Anthropic',
    },

    Effect.gen(function* () {
      const clientLayer = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);
      return (model, options): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never> => {
        // Resolve only when the request targets the edge provider (or leaves it unset).
        if (options?.provider !== undefined && options.provider !== Provider.edge.id) {
          return Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
        }
        // Edge models are served by Anthropic; the catalog supplies the back-end name, the output-token
        // ceiling, and which models use adaptive thinking (Opus).
        const info = Model.get(Provider.edge.id, model);
        if (!info) {
          return Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
        }
        const max_tokens = info.characteristics?.maxTokens;
        const thinking =
          info.characteristics?.thinking && (options?.thinking ?? true)
            ? // The Effect-AI Anthropic binding's `thinking.type` union predates Anthropic's `adaptive` mode.
              ({
                type: 'adaptive',
                // The API default omits thinking blocks from the stream; summaries keep them visible.
                display: 'summarized',
              } as const)
            : undefined;
        return AnthropicLanguageModel.layer({ model: info.backend, config: { thinking, max_tokens } }).pipe(
          Layer.provide(clientLayer),
        );
      };
    }),
  );
