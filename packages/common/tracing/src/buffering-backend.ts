//
// Copyright 2026 DXOS.org
//

import { type TraceContextData } from '@dxos/context';

import type { RemoteSpan, StartSpanOptions, TracingBackend } from './tracing-types';

export const BUFFERED_PREFIX = 'buffered-';

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
  readonly #pending: BufferedSpan[] = [];
  #counter = 0;

  startSpan(options: StartSpanOptions): RemoteSpan {
    const span = new BufferedSpan(options, ++this.#counter);
    this.#pending.push(span);
    return span;
  }

  /** Discard all buffered spans without replaying them. */
  clear(): void {
    this.#pending.length = 0;
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

    for (const buffered of this.#pending) {
      let parentContext = buffered.options.parentContext;
      if (parentContext && parentContext.traceparent.startsWith(BUFFERED_PREFIX)) {
        parentContext = idMap.get(parentContext.traceparent) ?? parentContext;
      }

      const real = backend.startSpan({ ...buffered.options, parentContext, startTime: buffered.startTime });

      if (real.spanContext) {
        idMap.set(buffered.spanContext.traceparent, real.spanContext);
      }

      buffered.replay(real);
    }
    this.#pending.length = 0;
    return idMap;
  }
}
