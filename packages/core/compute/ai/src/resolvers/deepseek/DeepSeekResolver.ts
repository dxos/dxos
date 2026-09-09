//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import * as AiModelResolver from '../../AiModelResolver';
import { AiModelNotAvailableError } from '../../errors';
import * as Model from '../../Model';
import * as Provider from '../../Provider';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';

/** Developer authority of the model ids this resolver serves. */
const DEEPSEEK_DEVELOPER = 'com.deepseek';

/**
 * DeepSeek resolver. Serves the edge-provider models whose id belongs to {@link DEEPSEEK_DEVELOPER},
 * declining anything another resolver owns. DeepSeek speaks the OpenAI-compatible Chat Completions
 * API, so it reuses the chat-completions adapter rather than a DeepSeek-specific binding; the caller
 * supplies the configured {@link ChatCompletionsAdapter.ChatCompletionsClient}, which decides the
 * transport — through EDGE (auth + metering) in the app, or a direct client in tests.
 */
export const make = () =>
  AiModelResolver.resolver(
    {
      name: 'DeepSeek',
    },

    Effect.gen(function* () {
      const clientLayer = Layer.succeed(
        ChatCompletionsAdapter.ChatCompletionsClient,
        yield* ChatCompletionsAdapter.ChatCompletionsClient,
      );
      return (model, options): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never> => {
        // Resolve only when the request targets the edge provider (or leaves it unset).
        if (options?.provider !== undefined && options.provider !== Provider.edge.id) {
          return Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
        }
        // The edge provider fronts several upstreams; this resolver claims the DeepSeek ids. The
        // catalog supplies the back-end name; V4 serves both modes from one name.
        const info = Model.get(Provider.edge.id, model);
        if (!info || Model.developer(model) !== DEEPSEEK_DEVELOPER) {
          return Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
        }
        // DeepSeek V4 enables thinking by default, so an explicit opt-out has to be sent; the
        // default effort ('high') is left to the provider.
        const thinking = options?.thinking ?? true;
        return ChatCompletionsAdapter.layer(info.backend, {
          body: { thinking: { type: thinking ? 'enabled' : 'disabled' } },
        }).pipe(Layer.provide(clientLayer));
      };
    }),
  );
