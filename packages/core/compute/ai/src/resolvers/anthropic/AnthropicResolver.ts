//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import type * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver.ts';
import { AiModelNotAvailableError } from '../../errors.ts';
import * as Model from '../../Model.ts';
import * as Provider from '../../Provider.ts';

/** Developer authority of the model ids this resolver serves. */
const ANTHROPIC_DEVELOPER = 'com.anthropic';

/**
 * The `thinking` request field for a model that does or does not think, given the caller's choice. A thinking model
 * asked not to gets an explicit `disabled`, since newer models (Haiku 5.5) think when the field is omitted.
 */
export const thinkingConfig = (modelThinks: boolean, requested: boolean | undefined) => {
  if (!modelThinks) {
    return undefined;
  }
  return (requested ?? true)
    ? ({
        type: 'adaptive',
        // The API default omits thinking blocks from the stream; summaries keep them visible.
        display: 'summarized',
      } as const)
    : ({ type: 'disabled' } as const);
};

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
        // The edge provider fronts several upstreams; this resolver claims the Anthropic ids. The
        // catalog supplies the back-end name, the output-token ceiling, and which models use adaptive
        // thinking (Opus).
        const info = Model.get(Provider.edge.id, model);
        if (!info || Model.developer(model) !== ANTHROPIC_DEVELOPER) {
          return Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
        }
        const max_tokens = info.characteristics?.maxTokens;
        const thinking = thinkingConfig(info.characteristics?.thinking ?? false, options?.thinking);
        return AnthropicLanguageModel.layer({ model: info.backend, config: { thinking, max_tokens } }).pipe(
          Layer.provide(clientLayer),
        );
      };
    }),
  );
