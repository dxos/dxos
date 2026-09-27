//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as Response from 'effect/unstable/ai/Response';
import * as Telemetry from 'effect/unstable/ai/Telemetry';
import { reportTrace, shouldReportTrace } from 'evalite/traces';

import { type AiService, Model } from '@dxos/ai';
import type { DXN } from '@dxos/keys';

import * as Cost from './Cost.ts';
import * as Transcript from './Transcript.ts';

/**
 * One model call's tokens and what they cost at the rate card in {@link Cost}. The counts travel
 * with the cost, so a run can be repriced when a rate changes.
 */
export type Call = {
  readonly model: string;
  readonly provider?: string;
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
  /** What the call was sent, when transcripts are being written. */
  readonly request?: Transcript.Request;
  /** USD at {@link Cost.PRICE_VERSION}; undefined for a model the card does not price. */
  readonly costUsd?: number;
  /** Epoch milliseconds. */
  readonly start: number;
  readonly end: number;
};

/** The provider's name for a model, as it would appear on an invoice. */
export const backendName = (model: DXN.DXN): string =>
  Model.all.find((entry) => entry.id.toString() === model.toString())?.backend ?? model.toString();

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
  { prompt, tools, response, span }: Parameters<Telemetry.SpanTransformer>[0],
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
  const tokens = {
    inputTokens:
      finish.usage.inputTokens.uncached ??
      (finish.usage.inputTokens.total ?? 0) -
        (finish.usage.inputTokens.cacheRead ?? 0) -
        (finish.usage.inputTokens.cacheWrite ?? 0),
    outputTokens: finish.usage.outputTokens.total ?? 0,
    cacheReadTokens: finish.usage.inputTokens.cacheRead ?? 0,
    cacheWriteTokens: finish.usage.inputTokens.cacheWrite ?? 0,
  };
  const start = millis(started);
  return {
    model: backendName(model),
    provider: string(span.attributes.get('gen_ai.system')),
    spanName: span.name,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    input: json(span.attributes.get('dxos.ai.input')),
    output: json(span.attributes.get('dxos.ai.output')),
    tools: json(span.attributes.get('dxos.ai.tools')),
    request: Transcript.directory() ? Transcript.captureRequest(prompt, tools) : undefined,
    ...tokens,
    costUsd: Cost.ofCall(backendName(model), tokens, new Date(start)),
    start,
    end: ended === undefined ? now : millis(ended),
  };
};

/**
 * The service with every model call's usage reported to `record`. The language model reads its
 * span transformer from the calling context, which is the model layer's, so the layer is rebuilt
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
            const call = fromResponse(model, input);
            if (call) {
              record(call);
            }
          };
          return Context.add(context, Telemetry.CurrentSpanTransformer, transformer);
        }),
      ),
    ),
});

/** Where the run's events went, so the export step can attach the scores to the same trace. */
export type Link = {
  readonly traceId: string;
  readonly experimentId: string;
  readonly experimentName: string;
};

/**
 * Hands the calls to evalite as traces, one per call, so the export carries them next to the
 * scores. A no-op outside an eval, where there is nothing to report to.
 */
export const report = (calls: readonly Call[], link: Link): void => {
  if (!shouldReportTrace()) {
    return;
  }
  for (const call of calls) {
    reportTrace({
      input: { model: call.model },
      output: {
        ...link,
        model: call.model,
        cacheReadTokens: call.cacheReadTokens,
        cacheWriteTokens: call.cacheWriteTokens,
        costUsd: call.costUsd,
      },
      usage: {
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        totalTokens: call.inputTokens + call.outputTokens,
      },
      start: call.start,
      end: call.end,
    });
  }
};
