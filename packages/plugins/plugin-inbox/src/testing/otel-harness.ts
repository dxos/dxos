//
// Copyright 2026 DXOS.org
//

import type * as Resource from '@effect/opentelemetry/Resource';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter, type ReadableSpan, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import { layerOtel } from '@dxos/effect';

/** Aggregated timings for all spans sharing a name. */
export interface SpanStats {
  readonly name: string;
  readonly count: number;
  readonly totalMs: number;
  readonly meanMs: number;
  readonly maxMs: number;
}

/**
 * In-memory OpenTelemetry harness for measuring `Effect.withSpan` durations in a test — captures the
 * spans the sync stack emits (root, fetch, per-commit-phase) without any external collector. A
 * `NodeSDK` with a synchronous {@link SimpleSpanProcessor} exports finished spans to an
 * {@link InMemorySpanExporter}, and {@link layer} bridges Effect's tracer to that global provider (so
 * `Effect.withSpan` spans are recorded). Start it in `beforeAll`, `stop` in `afterAll`, `reset`
 * between runs.
 */
export class OtelHarness {
  readonly #exporter = new InMemorySpanExporter();
  readonly #sdk: NodeSDK;

  /**
   * The tracer-bridge layer to `Effect.provide` around the traced effect: it replaces Effect's default
   * tracer with one backed by the global OTEL provider (registered by {@link start}), so it must be
   * provided while the harness is started.
   */
  readonly layer: Layer.Layer<Resource.Resource> = layerOtel(Effect.succeed({}));

  constructor(serviceName = 'inbox-sync-bench') {
    this.#sdk = new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
      spanProcessors: [new SimpleSpanProcessor(this.#exporter)],
    });
  }

  start(): void {
    this.#sdk.start();
  }

  async stop(): Promise<void> {
    await this.#sdk.shutdown();
  }

  reset(): void {
    this.#exporter.reset();
  }

  /** All finished spans captured since the last {@link reset}. */
  spans(): ReadableSpan[] {
    return this.#exporter.getFinishedSpans();
  }

  /** Per-name aggregated durations, most-expensive first. */
  aggregate(): SpanStats[] {
    return aggregateSpans(this.spans());
  }
}

/** Converts a span's HrTime `[seconds, nanos]` duration to milliseconds. */
const durationMs = (span: ReadableSpan): number => span.duration[0] * 1_000 + span.duration[1] / 1_000_000;

/** Groups spans by name into {@link SpanStats}, sorted by total duration descending. */
export const aggregateSpans = (spans: readonly ReadableSpan[]): SpanStats[] => {
  const byName = new Map<string, number[]>();
  for (const span of spans) {
    const durations = byName.get(span.name);
    if (durations) {
      durations.push(durationMs(span));
    } else {
      byName.set(span.name, [durationMs(span)]);
    }
  }
  return [...byName.entries()]
    .map(([name, durations]) => ({
      name,
      count: durations.length,
      totalMs: durations.reduce((sum, value) => sum + value, 0),
      meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      maxMs: Math.max(...durations),
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
};
