//
// Copyright 2026 DXOS.org
//

import { type TraceContextData } from '@dxos/context';

import type { RemoteSpan, StartSpanOptions, TracingBackend } from './tracing-types';

export const BUFFERED_PREFIX = 'buffered-';

/**
 * Cap on unreplayed spans. Reached only where no real backend ever registers, at roughly two spans
 * per database open, so the oldest are dropped rather than growing without bound; {@link
 * BufferingTracingBackend.dropped} records how many.
 */
export const MAX_BUFFERED_SPANS = 1_000;

/**
 * Span handle that records operations while no real OTEL backend is available.
 * Once a real backend is registered, the buffered span is replayed and a
 * {@link delegate} is set so future calls forward to the real span.
 */
class BufferedSpan implements RemoteSpan {
  readonly spanContext: TraceContextData;
  readonly startTime: number;
  delegate?: RemoteSpan;

  #ended = false;
  #endTime?: number;
  #error?: unknown;
  #hasError = false;

  constructor(
    readonly options: StartSpanOptions,
    id: number,
  ) {
    this.spanContext = { traceparent: `${BUFFERED_PREFIX}${id}` };
    this.startTime = Date.now();
  }

  end(endTime?: number): void {
    if (this.delegate) {
      this.delegate.end(endTime);
      return;
    }
    this.#endTime = endTime ?? Date.now();
    this.#ended = true;
  }

  setError(err: unknown): void {
    if (this.delegate) {
      this.delegate.setError?.(err);
      return;
    }
    this.#error = err;
    this.#hasError = true;
  }

  replay(real: RemoteSpan): void {
    if (this.#hasError) {
      real.setError?.(this.#error);
    }
    if (this.#ended) {
      real.end(this.#endTime);
    } else {
      this.delegate = real;
    }
  }
}

/**
 * A {@link TracingBackend} that buffers span operations until a real backend
 * registers. On {@link drain}, buffered spans are replayed in FIFO order with
 * parent IDs translated from synthetic `buffered-*` traceparents to real OTEL
 * IDs, preserving the trace hierarchy.
 */
export class BufferingTracingBackend implements TracingBackend {
  /**
   * Ring buffer over {@link MAX_BUFFERED_SPANS}. A host that never registers a real backend — every
   * EDGE worker, since observability is browser-only — would otherwise retain every span it ever
   * started for the lifetime of the process, and nothing would ever export them.
   */
  readonly #pending: (BufferedSpan | undefined)[] = [];
  /** Index of the oldest buffered span. */
  #head = 0;
  #size = 0;
  #dropped = 0;
  #counter = 0;

  /** Spans evicted unreplayed because the buffer was full. */
  get dropped(): number {
    return this.#dropped;
  }

  get size(): number {
    return this.#size;
  }

  startSpan(options: StartSpanOptions): RemoteSpan {
    const span = new BufferedSpan(options, ++this.#counter);
    if (this.#size < MAX_BUFFERED_SPANS) {
      this.#pending[(this.#head + this.#size) % MAX_BUFFERED_SPANS] = span;
      this.#size++;
    } else {
      this.#pending[this.#head] = span;
      this.#head = (this.#head + 1) % MAX_BUFFERED_SPANS;
      this.#dropped++;
    }
    return span;
  }

  /** Discard all buffered spans without replaying them. */
  clear(): void {
    this.#pending.length = 0;
    this.#head = 0;
    this.#size = 0;
    this.#dropped = 0;
  }

  /** Buffered spans in FIFO order, oldest first. */
  *#buffered(): Generator<BufferedSpan> {
    for (let index = 0; index < this.#size; index++) {
      const span = this.#pending[(this.#head + index) % MAX_BUFFERED_SPANS];
      if (span) {
        yield span;
      }
    }
  }

  /**
   * Replay all buffered spans into {@link backend}.
   *
   * @returns Map from synthetic buffered traceparent to real {@link TraceContextData},
   *   used by the post-drain translating wrapper to resolve stale buffered IDs
   *   still present on in-flight {@link Context} objects.
   */
  drain(backend: TracingBackend): Map<string, TraceContextData> {
    const idMap = new Map<string, TraceContextData>();

    for (const buffered of this.#buffered()) {
      let parentContext = buffered.options.parentContext;
      if (parentContext && parentContext.traceparent.startsWith(BUFFERED_PREFIX)) {
        // An untranslatable synthetic id means the parent is gone — evicted by the ring buffer, or
        // replayed into a backend that returned no context. Forwarding it would hand the real
        // backend a traceparent it cannot parse, so re-root the span instead.
        parentContext = idMap.get(parentContext.traceparent);
      }

      const real = backend.startSpan({ ...buffered.options, parentContext, startTime: buffered.startTime });

      if (real.spanContext) {
        idMap.set(buffered.spanContext.traceparent, real.spanContext);
      }

      buffered.replay(real);
    }
    this.clear();
    return idMap;
  }
}
