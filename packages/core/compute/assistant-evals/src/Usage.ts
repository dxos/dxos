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

/**
 * One model call's tokens. Cost is not computed here: prices change and differ by route, so the
 * export carries the counts and the model, and a price is applied where the data is read.
 */
export type Call = {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  /** Epoch milliseconds. */
  readonly start: number;
  readonly end: number;
  /** What the caller itself reported, when it prices its own calls (the Claude Code CLI does). */
  readonly costUsd?: number;
};

/** The provider's name for a model, as it would appear on an invoice. */
export const backendName = (model: DXN.DXN): string =>
  Model.all.find((entry) => entry.id.toString() === model.toString())?.backend ?? model.toString();

const millis = (nanos: bigint): number => Number(nanos / 1_000_000n);

const fromResponse = (
  model: DXN.DXN,
  response: ReadonlyArray<Response.AllParts<any>>,
  span: Parameters<Telemetry.SpanTransformer>[0]['span'],
): Call | undefined => {
  const finish = response.find((part): part is Response.FinishPart => part.type === 'finish');
  if (!finish) {
    return undefined;
  }
  const now = Date.now();
  const started = span.status.startTime;
  const ended = span.status._tag === 'Ended' ? span.status.endTime : undefined;
  return {
    model: backendName(model),
    inputTokens: finish.usage.inputTokens.total ?? 0,
    outputTokens: finish.usage.outputTokens.total ?? 0,
    cacheReadTokens: finish.usage.inputTokens.cacheRead ?? 0,
    cacheWriteTokens: finish.usage.inputTokens.cacheWrite ?? 0,
    start: millis(started),
    end: ended === undefined ? now : millis(ended),
  };
};

/**
 * The service with every model call's usage reported to `record`. The language model reads its
 * span transformer from the calling context, which is the model layer's, so the layer is rebuilt
 * with a transformer that records after the one it found.
 */
export const instrument = (service: AiService.Service, record: (call: Call) => void): AiService.Service => ({
  metadata: service.metadata,
  model: (model, options) =>
    Layer.effectContext(
      Layer.build(service.model(model, options)).pipe(
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

/**
 * Hands the calls to evalite as traces, one per call, so the export carries them next to the
 * scores. A no-op outside an eval, where there is nothing to report to.
 */
export const report = (calls: readonly Call[]): void => {
  if (!shouldReportTrace()) {
    return;
  }
  for (const call of calls) {
    reportTrace({
      input: { model: call.model },
      output: {
        model: call.model,
        cacheReadTokens: call.cacheReadTokens,
        cacheWriteTokens: call.cacheWriteTokens,
        ...(call.costUsd === undefined ? {} : { costUsd: call.costUsd }),
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
