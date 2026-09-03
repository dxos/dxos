//
// Copyright 2026 DXOS.org
//

import { type Attributes, type Context, SpanStatusCode } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { SpanAttributes } from '@dxos/effect';

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
 * The rules are the canonical tail-sampling set — keep what errored, keep what was slow, sample the
 * rest — as described in OpenTelemetry's own writeup and implemented by the Collector's
 * `tailsamplingprocessor` policies (`status_code`, `latency`, `probabilistic`):
 *
 * - https://opentelemetry.io/blog/2022/tail-sampling/
 * - https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
 *
 * Expressing them as a processor that filters in `onEnd` is the documented way to drop spans from a
 * JS SDK, since a `Sampler` cannot: https://github.com/open-telemetry/opentelemetry-js/discussions/2817
 *
 * In order:
 * - a span that **errored** is kept, and its trace is promoted;
 * - a span slower than {@link DEFAULT_SLOW_MS} is kept, and its trace is promoted;
 * - a span carrying `gen_ai.*` or `dxos.ai.kind` — a model call, or the turn and tool calls
 *   around it that the AI analytics sink reports — is kept, and its trace is promoted, so a model call is never a
 *   fraction of the calls that happened. This one is ours rather than canonical: the AI events are
 *   what price the product, and a sampled fraction of them reports a fraction of the spend;
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
 * Above this, a span is kept as slow.
 *
 * Far above the 5s the Collector's examples use, because this app's slowest spans are model calls
 * and a conversation turn legitimately runs for tens of seconds — a 5s threshold would promote
 * nearly every AI trace and quietly turn the ratio off for exactly the traffic there is most of.
 * At 30s what is left is a hang rather than a slow answer.
 */
export const DEFAULT_SLOW_MS = 30_000;

/**
 * Bound on remembered trace ids. Reached only under a burst far above normal span rates, and a trace
 * evicted early degrades to the ratio rather than to a dropped span.
 */
const DEFAULT_MAX_TRACKED_TRACES = 10_000;

export type Options = {
  ratio?: number;
  slowMs?: number;
  maxTrackedTraces?: number;
};

/** The parts of an ended span the rules read, whether it arrived over a port or ended in-process. */
export type Decidable = {
  readonly traceId: string;
  readonly status: { readonly code: SpanStatusCode };
  readonly attributes: Attributes;
  readonly durationMs: number;
};

export class TailSampler {
  private readonly _ratio: number;
  private readonly _slowMs: number;
  private readonly _maxTrackedTraces: number;
  /** Insertion-ordered, so the oldest entry is the first key — an LRU without the bookkeeping. */
  private readonly _promoted = new Set<string>();

  constructor({
    ratio = DEFAULT_RATIO,
    slowMs = DEFAULT_SLOW_MS,
    maxTrackedTraces = DEFAULT_MAX_TRACKED_TRACES,
  }: Options = {}) {
    this._ratio = ratio;
    this._slowMs = slowMs;
    this._maxTrackedTraces = maxTrackedTraces;
  }

  /** Whether the span should be forwarded to the exporter. */
  keep(span: Decidable): boolean {
    if (this._isPromotable(span)) {
      this.promote(span.traceId);
      return true;
    }
    return this._promoted.has(span.traceId) || sampledByTraceId(span.traceId, this._ratio);
  }

  private _isPromotable(span: Decidable): boolean {
    return (
      span.status.code === SpanStatusCode.ERROR ||
      span.durationMs > this._slowMs ||
      Object.keys(span.attributes).some(isAiAttribute)
    );
  }

  /**
   * Keeps every later span of the trace. Called for what the sampler cannot see itself: a log at
   * warning or above names a trace worth keeping the same way an errored span does.
   */
  promote(traceId: string): void {
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

/** `gen_ai.*` marks a model call; `dxos.ai.kind` the turn around it and the tool calls inside it. */
const isAiAttribute = (key: string): boolean => key.startsWith(GEN_AI_PREFIX) || key === SpanAttributes.AI.kind;

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

/** OTel reports durations as `[seconds, nanoseconds]`. */
export const hrTimeToMs = ([seconds, nanos]: [number, number]): number => seconds * 1_000 + nanos / 1e6;

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

  /** See {@link TailSampler.promote}. */
  promote(traceId: string): void {
    this._sampler.promote(traceId);
  }

  onEnd(span: ReadableSpan): void {
    const { traceId } = span.spanContext();
    const decidable = {
      traceId,
      status: span.status,
      attributes: span.attributes,
      durationMs: hrTimeToMs(span.duration),
    };
    if (this._sampler.keep(decidable)) {
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
