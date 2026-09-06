//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as Config from 'effect/Config';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as ChatCompletionsAdapter from '@dxos/ai/chat-completions';

/**
 * The two model back-ends. Ollama is the default — the whole point is a workspace that runs with no
 * account and no egress — and Anthropic is the escape hatch for a host that cannot run a 20B model
 * locally. Both are plain `LanguageModel` layers, so nothing downstream knows which is in play.
 */

export class ModelError extends Data.TaggedError('code-index/ModelError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const OLLAMA_ENDPOINT = 'http://localhost:11434';

export const DEFAULT_OLLAMA_MODEL = 'gpt-oss:20b';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

export type Provider = 'ollama' | 'anthropic';

export const PROVIDERS: readonly Provider[] = ['ollama', 'anthropic'];

export const isProvider = (value: string): value is Provider => PROVIDERS.includes(value as Provider);

export type Selection = {
  readonly provider: Provider;
  readonly model: string;
  readonly endpoint?: string;
};

/** The model a flagless invocation gets: local, unless only a key is available. */
export const defaults = (env: Record<string, string | undefined> = process.env): Selection =>
  env.CODE_INDEX_MODEL !== undefined
    ? { provider: env.CODE_INDEX_PROVIDER === 'anthropic' ? 'anthropic' : 'ollama', model: env.CODE_INDEX_MODEL }
    : { provider: 'ollama', model: DEFAULT_OLLAMA_MODEL };

/**
 * Ollama over its own `/api/chat` dialect rather than the OpenAI-compatible path: the adapter
 * speaks it directly, and Ollama's compatibility layer drops fields this needs.
 */
const ollama = (model: string, endpoint: string): Layer.Layer<LanguageModel.LanguageModel> =>
  ChatCompletionsAdapter.layer(model).pipe(
    Layer.provide(
      ChatCompletionsAdapter.clientLayer({ baseUrl: endpoint, apiFormat: 'ollama', provider: 'ollama' }).pipe(
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
  );

/**
 * Anthropic, keyed from `DX_ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEY`. The key is read as a
 * `Redacted` so a failed request cannot print it.
 */
const anthropic = (model: string): Layer.Layer<LanguageModel.LanguageModel, ModelError> =>
  Layer.unwrap(
    Effect.map(
      Config.redacted('DX_ANTHROPIC_API_KEY').pipe(
        Config.orElse(() => Config.redacted('ANTHROPIC_API_KEY')),
        Effect.mapError(
          () =>
            new ModelError({
              message: 'Anthropic needs DX_ANTHROPIC_API_KEY (or ANTHROPIC_API_KEY) in the environment.',
            }),
        ),
      ),
      (apiKey) =>
        AnthropicLanguageModel.layer({ model }).pipe(
          Layer.provide(
            AnthropicClient.layer({ apiKey: Redacted.make(Redacted.value(apiKey)) }).pipe(
              Layer.provide(FetchHttpClient.layer),
            ),
          ),
        ),
    ),
  );

/** The language model for a selection. */
export const layer = (selection: Selection): Layer.Layer<LanguageModel.LanguageModel, ModelError> =>
  selection.provider === 'anthropic'
    ? anthropic(selection.model)
    : ollama(selection.model, selection.endpoint ?? OLLAMA_ENDPOINT);

/** Resolves a `--provider`/`--model` pair, filling in each provider's own default model. */
export const select = (options: {
  readonly provider?: string;
  readonly model?: string;
  readonly endpoint?: string;
}): Effect.Effect<Selection, ModelError> => {
  const provider = options.provider ?? (options.model !== undefined ? 'ollama' : defaults().provider);
  if (!isProvider(provider)) {
    return Effect.fail(new ModelError({ message: `Unknown provider: ${provider}. Use ollama or anthropic.` }));
  }
  return Effect.succeed({
    provider,
    model: options.model ?? (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OLLAMA_MODEL),
    endpoint: options.endpoint,
  });
};
