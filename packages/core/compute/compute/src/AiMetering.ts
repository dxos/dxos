//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';

import { AiService, AiUsage } from '@dxos/ai';

import * as Trace from './Trace.ts';

/**
 * An `AiService` that writes a {@link Trace.ModelCall} event for every language-model call made
 * through the `AiService` below it, so a run's token usage (and, with catalog prices, its cost) can
 * be read back from its trace. Lives here rather than in `@dxos/ai`, which cannot depend on the trace.
 */
export const metered: Layer.Layer<AiService.AiService, never, AiService.AiService | Trace.TraceService> = Layer.effect(
  AiService.AiService,
  Effect.gen(function* () {
    const upstream = yield* AiService.AiService;
    const writer = yield* Trace.TraceService;
    return AiUsage.instrument(upstream, (call) => {
      // The recorder runs synchronously on the model call's fiber, so the caller's thread is readable here.
      const thread = Fiber.getCurrent()?.getRef(Trace.CurrentThread);
      writer.write(
        Trace.ModelCall,
        {
          modelId: call.modelId,
          model: call.model,
          provider: call.provider,
          stage: call.stage,
          spanName: call.spanName,
          inputTokens: call.inputTokens,
          outputTokens: call.outputTokens,
          cacheReadTokens: call.cacheReadTokens,
          cacheWriteTokens: call.cacheWriteTokens,
          start: call.start,
          end: call.end,
        },
        thread === undefined ? undefined : { thread },
      );
    });
  }),
);

/** Token and dollar totals for one model (and stage), as {@link summarize} reports them. */
export type Total = AiUsage.Tokens & {
  readonly model: string;
  readonly stage?: string;
  readonly calls: number;
  /** USD at the catalog's list price; undefined when the catalog has no price for the model. */
  readonly cost?: number;
};

/**
 * Totals of the {@link Trace.ModelCall} events among `events`, one per model and stage, priced from
 * the model catalog.
 */
export const summarize = (events: Iterable<Trace.Event>): Total[] => {
  const totals = new Map<string, Total & { readonly modelId?: string }>();
  for (const event of events) {
    if (!Trace.isOfType(Trace.ModelCall, event)) {
      continue;
    }
    const call = event.data;
    const key = `${call.modelId ?? call.model}\u0000${call.stage ?? ''}`;
    const total = totals.get(key) ?? {
      modelId: call.modelId,
      model: call.model,
      stage: call.stage,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    totals.set(key, {
      ...total,
      calls: total.calls + 1,
      inputTokens: total.inputTokens + call.inputTokens,
      outputTokens: total.outputTokens + call.outputTokens,
      cacheReadTokens: total.cacheReadTokens + call.cacheReadTokens,
      cacheWriteTokens: total.cacheWriteTokens + call.cacheWriteTokens,
    });
  }
  return [...totals.values()].map(({ modelId, ...total }) => {
    const pricing = modelId === undefined ? undefined : AiUsage.pricingOf(modelId);
    return pricing === undefined ? total : { ...total, cost: AiUsage.cost(total, pricing) };
  });
};
