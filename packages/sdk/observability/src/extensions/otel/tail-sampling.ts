//
// Copyright 2026 DXOS.org
//

import { type Attributes, type Context, SpanStatusCode } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

/**
 * Tail sampling for spans arriving at the observability worker.
 *
 * Head sampling cannot express either rule we want. A sampler runs when a span is *created*, so it
 * cannot know that the span will fail, and it sees the span name before the provider has annotated
 * it. Both decisions are only available once the span has ended — which is what "tail" means. The
 * canonical implementation of this is the OpenTelemetry Collector's tail-sampling processor, which
 * buffers whole traces server-side; there is no collector between Composer and SigNoz, so the same
 * decisions are made here instead, on the spans this realm produced.
 *
 * The rules, in order:
 * - a span that **errored** is kept, and its trace is promoted;
 * - a span carrying `gen_ai.*` is kept, and its trace is promoted, so a model call is never a
 *   fraction of the calls that happened;
 * - any other span of a **promoted** trace is kept;
 * - everything else is kept at {@link DEFAULT_RATIO}, keyed on the trace id so the decision is the
 *   same for every span of a trace.
 *
 * Promotion is remembered rather than buffered: holding span payloads until a trace settles would
 * mean an unbounded buffer and a decision delay, and a conversation's trace can stay open for
 * minutes. Remembering only the trace id costs nothing and recovers the case that matters, since a
 * parent ends *after* its children — so promoting on the first error keeps the ancestors that
 * explain it. Siblings that already ended and were dropped are not recovered; that is the price of
 * not buffering, and it is why an errored trace can arrive with gaps rather than whole.
 */

/** Kept fraction for a trace that nothing promoted. Matches the head ratio this replaced. */
export const DEFAULT_RATIO = 0.3;

/**
 * Bound on remembered trace ids. Reached only under a burst far above normal span rates, and a trace
 * evicted early degrades to the ratio rather than to a dropped span.
 */
const DEFAULT_MAX_TRACKED_TRACES = 10_000;

export type Options = {
  ratio?: number;
  maxTrackedTraces?: number;
};

/** The parts of an ended span the rules read, whether it arrived over a port or ended in-process. */
export type Decidable = {
  readonly traceId: string;
  readonly status: { readonly code: SpanStatusCode };
  readonly attributes: Attributes;
};

export class TailSampler {
  private readonly _ratio: number;
  private readonly _maxTrackedTraces: number;
  /** Insertion-ordered, so the oldest entry is the first key — an LRU without the bookkeeping. */
  private readonly _promoted = new Set<string>();

  constructor({ ratio = DEFAULT_RATIO, maxTrackedTraces = DEFAULT_MAX_TRACKED_TRACES }: Options = {}) {
    this._ratio = ratio;
    this._maxTrackedTraces = maxTrackedTraces;
  }

  /** Whether the span should be forwarded to the exporter. */
  keep(span: Decidable): boolean {
    if (isPromotable(span)) {
      this._promote(span.traceId);
      return true;
    }
    return this._promoted.has(span.traceId) || sampledByTraceId(span.traceId, this._ratio);
  }

  private _promote(traceId: string): void {
    // Re-inserting moves the id to the end, so an active trace is not evicted ahead of a stale one.
    this._promoted.delete(traceId);
    this._promoted.add(traceId);
    while (this._promoted.size > this._maxTrackedTraces) {
      const oldest = this._promoted.values().next();
      if (oldest.done) {
        break;
      }
      this._promoted.delete(oldest.value);
    }
  }
}

const GEN_AI_PREFIX = 'gen_ai.';

const isPromotable = (span: Decidable): boolean =>
  span.status.code === SpanStatusCode.ERROR || Object.keys(span.attributes).some(isGenAiAttribute);

const isGenAiAttribute = (key: string): boolean => key.startsWith(GEN_AI_PREFIX);

/**
 * Deterministic per trace, so every span of a trace decides the same way. Reads the low 8 hex digits
 * of the 32-hex-digit trace id — the id is random, so any window is uniform, and 32 bits is well
 * inside the exact range of a double.
 */
const sampledByTraceId = (traceId: string, ratio: number): boolean => {
  if (ratio >= 1) {
    return true;
  }
  if (ratio <= 0 || traceId.length < 8) {
    return false;
  }
  const value = Number.parseInt(traceId.slice(-8), 16);
  return Number.isNaN(value) ? false : value / 0x1_0000_0000 < ratio;
};

/**
 * Applies the same rules in-process, for the path that exports without a worker (node, and a browser
 * with no observability worker). Without it that path would export everything, since head sampling
 * no longer thins anything.
 */
export class TailSamplingSpanProcessor implements SpanProcessor {
  private readonly _sampler: TailSampler;

  constructor(
    private readonly _delegate: SpanProcessor,
    options?: Options,
  ) {
    this._sampler = new TailSampler(options);
  }

  onStart(span: Span, parentContext: Context): void {
    this._delegate.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    const { traceId } = span.spanContext();
    if (this._sampler.keep({ traceId, status: span.status, attributes: span.attributes })) {
      this._delegate.onEnd(span);
    }
  }

  forceFlush(): Promise<void> {
    return this._delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._delegate.shutdown();
  }
}
