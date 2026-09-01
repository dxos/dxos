//
// Copyright 2026 DXOS.org
//

import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { log } from '@dxos/log';

/**
 * Lets a consumer observe ended spans without owning a tracer provider.
 *
 * The SDK takes its span processors at construction and offers no way to add one afterwards
 * (`addSpanProcessor` was removed in 2.x), while the provider is built during observability
 * initialization and its consumers — AI capture, for one — activate on their own schedule. Rather
 * than each growing a provider of its own, and with it a second sampler and a second `Tracer` for
 * the same spans, they attach here.
 *
 * Module-scoped to match what it bridges to: the provider it feeds is registered as the OTel global,
 * and a realm has one of each.
 */
const processors = new Set<SpanProcessor>();

/** Attaches a processor to the realm's tracer provider. Returns a function that detaches it. */
export const addSpanProcessor = (processor: SpanProcessor): (() => void) => {
  processors.add(processor);
  return () => {
    processors.delete(processor);
  };
};

/**
 * Passed to the provider at construction; delegates to whatever has attached by the time a span
 * ends. A processor that throws is logged and skipped — `onEnd` runs inside `Span.end()`, on the
 * fiber that created the span, so an escaping error would fail unrelated work.
 */
export class FanoutSpanProcessor implements SpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    for (const processor of processors) {
      try {
        processor.onStart(span, parentContext);
      } catch (err) {
        log.catch(err);
      }
    }
  }

  onEnd(span: ReadableSpan): void {
    for (const processor of processors) {
      try {
        processor.onEnd(span);
      } catch (err) {
        log.catch(err);
      }
    }
  }

  async forceFlush(): Promise<void> {
    await Promise.allSettled([...processors].map((processor) => processor.forceFlush()));
  }

  async shutdown(): Promise<void> {
    await Promise.allSettled([...processors].map((processor) => processor.shutdown()));
  }
}
