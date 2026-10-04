//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as AiError from 'effect/ai/AiError';
import type * as LanguageModel from 'effect/ai/LanguageModel';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Data from 'effect/Data';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

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
      Config.Redacted('DX_ANTHROPIC_API_KEY').pipe(
        Config.orElse(() => Config.Redacted('ANTHROPIC_API_KEY')),
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
  const configured = defaults();
  const provider = options.provider ?? (options.model !== undefined ? 'ollama' : configured.provider);
  if (!isProvider(provider)) {
    return Effect.fail(new ModelError({ message: `Unknown provider: ${provider}. Use ollama or anthropic.` }));
  }
  // The environment's model counts too, and only for the provider it was configured against: a
  // `CODE_INDEX_MODEL` naming an Ollama tag must not be handed to Anthropic because a `--provider`
  // flag moved. A flag always wins; the built-in default is the last resort.
  const fromEnvironment = provider === configured.provider ? configured.model : undefined;
  return Effect.succeed({
    provider,
    model:
      options.model ?? fromEnvironment ?? (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OLLAMA_MODEL),
    endpoint: options.endpoint,
  });
};

/** Whether either Anthropic key variable is set, without reading the value anywhere it could print. */
export const hasAnthropicKey = (env: Record<string, string | undefined> = process.env): boolean =>
  Boolean(env.DX_ANTHROPIC_API_KEY) || Boolean(env.ANTHROPIC_API_KEY);

const START_OLLAMA = (selection: Selection): string =>
  `start it with \`ollama serve\` (and \`ollama pull ${selection.model}\`), ` +
  'or pass --provider anthropic with DX_ANTHROPIC_API_KEY set';

export type Availability = {
  readonly selection: Selection;
  /** One line for stderr when the selection changed or will not work. */
  readonly notice?: string;
};

/**
 * Settles the model once Ollama has been probed. An unreachable Ollama falls back to Anthropic only
 * when a key is present and the user named no provider, model or endpoint, since any of those says
 * what they asked for and a silent switch would override it.
 */
export const settle = (
  selection: Selection,
  options: { readonly reachable: boolean; readonly chosen: boolean; readonly hasKey: boolean },
): Availability => {
  if (selection.provider !== 'ollama' || options.reachable) {
    return { selection };
  }
  const endpoint = selection.endpoint ?? OLLAMA_ENDPOINT;
  if (!options.chosen && options.hasKey) {
    return {
      selection: { provider: 'anthropic', model: DEFAULT_ANTHROPIC_MODEL },
      notice: `Ollama is not reachable at ${endpoint}; using anthropic/${DEFAULT_ANTHROPIC_MODEL} because an Anthropic key is set.`,
    };
  }
  return {
    selection,
    notice: `Ollama is not reachable at ${endpoint}, so chat turns will fail: ${START_OLLAMA(selection)}.`,
  };
};

/** How long the startup probe waits; a local server answers in milliseconds or not at all. */
export const PROBE_TIMEOUT = Duration.seconds(2);

/** Whether an Ollama server answers at `endpoint`; any failure, timeout included, is "no". */
export const probe = (endpoint: string, timeout: Duration.Input = PROBE_TIMEOUT): Effect.Effect<boolean> =>
  Effect.tryPromise(() =>
    fetch(new URL('/api/version', endpoint), { signal: AbortSignal.timeout(Duration.toMillis(timeout)) }),
  ).pipe(
    Effect.map((response) => response.ok),
    Effect.orElseSucceed(() => false),
  );

/** Probes Ollama when it is selected, prints what was decided, and returns the model to run. */
export const ensureAvailable = (
  selection: Selection,
  options: { readonly chosen: boolean },
): Effect.Effect<Selection> =>
  Effect.gen(function* () {
    if (selection.provider !== 'ollama') {
      return selection;
    }
    const reachable = yield* probe(selection.endpoint ?? OLLAMA_ENDPOINT);
    const settled = settle(selection, { reachable, chosen: options.chosen, hasKey: hasAnthropicKey() });
    if (settled.notice !== undefined) {
      yield* Console.error(settled.notice);
    }
    return settled.selection;
  });

/** The route the Ollama dialect posts every turn to, which marks a transport failure as Ollama's. */
const OLLAMA_CHAT_PATH = '/api/chat';

/**
 * A failed model call in words a user can act on, or none when the failure is not the transport's.
 * The provider's own text ends in generic advice to "check your network connection", which says
 * nothing about the usual cause here: no Ollama running on this machine.
 */
export const explainFailure = (cause: unknown): string | undefined => {
  if (!AiError.isAiError(cause) || cause.reason._tag !== 'NetworkError') {
    return undefined;
  }
  const url = cause.reason.request.url;
  return url.endsWith(OLLAMA_CHAT_PATH)
    ? `Cannot reach Ollama at ${url.slice(0, -OLLAMA_CHAT_PATH.length)}: start it with \`ollama serve\`, or restart with --provider anthropic and DX_ANTHROPIC_API_KEY set.`
    : `Cannot reach the model at ${url || 'its endpoint'}: ${cause.reason.description ?? cause.reason.reason}.`;
};
