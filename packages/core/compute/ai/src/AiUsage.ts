//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Response from 'effect/ai/Response';
import * as Telemetry from 'effect/ai/Telemetry';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import type { DXN } from '@dxos/keys';

import type * as AiService from './AiService.ts';
import * as Model from './Model.ts';

/**
 * One model call's tokens. Cost is not stored: prices change and differ by route, so a call carries
 * the counts and the model, and {@link cost} applies a price where the data is read.
 */
export type Call = {
  /** Catalog id of the model (a DXN string); absent for calls made outside the catalog, such as a CLI agent's. */
  readonly modelId?: string;
  /** The provider's name for the model, as it would appear on an invoice. */
  readonly model: string;
  readonly provider?: string;
  /** The pipeline or agent stage that made the call (see {@link Stage}). */
  readonly stage?: string;
  readonly spanName?: string;
  readonly parameters?: Record<string, unknown>;
  /** The prompt, the response and the tool catalog, as the telemetry serialized them. */
  readonly input?: unknown;
  readonly output?: unknown;
  readonly tools?: unknown;
  /** Prompt tokens the provider actually processed: the cache-read and cache-write counts are separate. */
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  /** Epoch milliseconds. */
  readonly start: number;
  readonly end: number;
};

/**
 * The stage a model call belongs to (e.g. `extract-facts`), stamped on its {@link Call}. A span name
 * cannot tell stages apart, since every stage calls the same `LanguageModel` methods.
 */
export const Stage: Context.Reference<string | undefined> = Context.Reference<string | undefined>(
  '@dxos/ai/AiUsage/Stage',
  { defaultValue: () => undefined },
);

/** Runs `effect` with its model calls attributed to `stage`. */
export const withStage =
  (stage: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, Stage, stage);

/** The provider's name for a model, as it would appear on an invoice. */
export const backendName = (model: DXN.DXN): string =>
  Model.all.find((entry) => entry.id.toString() === model.toString())?.backend ?? model.toString();

/** The catalog's list price for a model id, when it has one. */
export const pricingOf = (modelId: string): Model.Pricing | undefined =>
  Model.all.find((entry) => entry.id.toString() === modelId && entry.pricing !== undefined)?.pricing;

/** Tokens a call was billed for, by kind. */
export type Tokens = Pick<Call, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>;

/** USD for `tokens` at `pricing`; cache tokens fall back to the input price when the catalog does not price them. */
export const cost = (tokens: Tokens, pricing: Model.Pricing): number =>
  (tokens.inputTokens * pricing.input +
    tokens.outputTokens * pricing.output +
    tokens.cacheReadTokens * (pricing.cacheRead ?? pricing.input) +
    tokens.cacheWriteTokens * (pricing.cacheWrite ?? pricing.input)) /
  1_000_000;

const millis = (nanos: bigint): number => Number(nanos / 1_000_000n);

const string = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The telemetry stamps content as JSON text; a value cut to fit no longer parses and stays text. */
const json = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const fromResponse = (
  model: DXN.DXN,
  response: ReadonlyArray<Response.AnyPart>,
  span: Parameters<Telemetry.SpanTransformer>[0]['span'],
): Call | undefined => {
  const finish = response.find((part): part is Response.FinishPart => part.type === 'finish');
  if (!finish) {
    return undefined;
  }
  const now = Date.now();
  const started = span.status.startTime;
  const ended = span.status._tag === 'Ended' ? span.status.endTime : undefined;
  const parameters = Object.fromEntries(
    ['temperature', 'max_tokens', 'top_p', 'top_k']
      .map((key) => [key, span.attributes.get(`gen_ai.request.${key}`)] as const)
      .filter(([, value]) => value !== undefined),
  );
  return {
    modelId: model.toString(),
    model: backendName(model),
    provider: string(span.attributes.get('gen_ai.provider.name')),
    // The transformer runs on the model call's own fiber, so its references are the caller's.
    stage: Fiber.getCurrent()?.getRef(Stage),
    spanName: span.name,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    input: json(span.attributes.get('dxos.ai.input')),
    output: json(span.attributes.get('dxos.ai.output')),
    tools: json(span.attributes.get('dxos.ai.tools')),
    inputTokens:
      finish.usage.inputTokens.uncached ??
      (finish.usage.inputTokens.total ?? 0) -
        (finish.usage.inputTokens.cacheRead ?? 0) -
        (finish.usage.inputTokens.cacheWrite ?? 0),
    outputTokens: finish.usage.outputTokens.total ?? 0,
    cacheReadTokens: finish.usage.inputTokens.cacheRead ?? 0,
    cacheWriteTokens: finish.usage.inputTokens.cacheWrite ?? 0,
    start: millis(started),
    end: ended === undefined ? now : millis(ended),
  };
};

/**
 * The service with every language-model call's usage reported to `record`. The language model reads
 * its span transformer from the calling context, which is the model layer's, so the layer is rebuilt
 * with a transformer that records after the one it found.
 */
export const instrument = (service: AiService.Service, record: (call: Call) => void): AiService.Service => ({
  ...service,
  languageModel: (model, options) =>
    Layer.effectContext(
      Layer.build(service.languageModel(model, options)).pipe(
        Effect.map((context) => {
          const inner = Context.getOption(context, Telemetry.CurrentSpanTransformer);
          const transformer: Telemetry.SpanTransformer = (input) => {
            Option.map(inner, (transform) => transform(input));
            const call = fromResponse(model, input.response, input.span);
            if (call) {
              record(call);
            }
          };
          return Context.add(context, Telemetry.CurrentSpanTransformer, transformer);
        }),
      ),
    ),
});
