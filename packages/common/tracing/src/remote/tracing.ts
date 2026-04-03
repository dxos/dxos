//
// Copyright 2024 DXOS.org
//

import { type TracingSpan } from '../trace-processor';

type RemoteSpan = {
  end: () => void;
  /** Wraps execution so that this span becomes the active parent for child spans. */
  wrapExecution?: <T>(fn: () => T) => T;
  /** Opaque context object for the backend (e.g., OTEL Context with this span active). */
  spanContext?: unknown;
};

export type StartSpanOptions = {
  name: string;
  op?: string;
  attributes?: Record<string, any>;
  /** Opaque parent context from a parent RemoteSpan (bridges async DXOS Context to OTEL). */
  parentContext?: unknown;
};

interface TracingMethods {
  startSpan: (options: StartSpanOptions) => RemoteSpan;
}

const MAX_ENDED_CONTEXTS = 10_000;

/**
 * Allows traces to be recorded within SDK code without requiring specific consumers.
 *
 * Preserves OTEL span contexts after spans end so that long-lived DXOS Contexts
 * (e.g., `this._ctx` stored during `open()`) can still serve as parents for
 * later child spans and outbound trace-context injection.
 */
export class RemoteTracing {
  private _tracing: TracingMethods | undefined;
  private _spanMap = new Map<TracingSpan, RemoteSpan>();
  private _idToSpan = new Map<number, TracingSpan>();

  /**
   * Retains OTEL span contexts after spans end so that periodic/background
   * operations referencing a completed parent (via `this._ctx`) still produce
   * correlated child spans instead of orphaned root traces.
   */
  private _endedSpanContexts = new Map<number, unknown>();

  /** Negative counter for virtual span IDs that don't collide with real TracingSpan IDs. */
  private _nextVirtualSpanId = -1;

  /**
   * Buffers flushSpan calls that arrive before a processor is registered,
   * so early startup spans are not silently dropped.
   */
  private _pendingFlushes: Array<{ span: TracingSpan; isEnd: boolean }> | null = [];

  registerProcessor(processor: TracingMethods): void {
    this._tracing = processor;

    const pending = this._pendingFlushes;
    this._pendingFlushes = null;
    if (pending) {
      for (const { span, isEnd } of pending) {
        this._replayFlush(span, isEnd);
      }
    }
  }

  /** Returns the opaque OTEL context for the given DXOS span ID, if one exists. */
  getSpanContext(spanId: number): unknown | undefined {
    const tracingSpan = this._idToSpan.get(spanId);
    if (tracingSpan) {
      return this._spanMap.get(tracingSpan)?.spanContext;
    }
    return this._endedSpanContexts.get(spanId);
  }

  /**
   * Registers an external (remote) OTEL context as a virtual parent span.
   * Returns a virtual span ID that can be placed on a DXOS Context so child
   * `@trace.span()` methods create properly-parented OTEL spans.
   */
  registerRemoteParent(otelContext: unknown): number {
    const virtualId = this._nextVirtualSpanId--;
    this._endedSpanContexts.set(virtualId, otelContext);
    this._evictEndedContexts();
    return virtualId;
  }

  /** Wraps execution so that the remote span is active as parent context. */
  wrapExecution<T>(span: TracingSpan, fn: () => T): T {
    const remoteSpan = this._spanMap.get(span);
    if (remoteSpan?.wrapExecution) {
      return remoteSpan.wrapExecution(fn);
    }
    return fn();
  }

  flushSpan(span: TracingSpan): void {
    if (!span.showInRemoteTracing) {
      return;
    }

    if (!this._tracing) {
      this._pendingFlushes?.push({ span, isEnd: !!span.endTs });
      return;
    }

    if (!span.endTs) {
      this._startRemoteSpan(span);
    } else {
      this._endRemoteSpan(span);
    }
  }

  private _startRemoteSpan(span: TracingSpan): void {
    let parentContext: unknown;
    if (span.parentId != null) {
      const parentTracingSpan = this._idToSpan.get(span.parentId);
      if (parentTracingSpan) {
        parentContext = this._spanMap.get(parentTracingSpan)?.spanContext;
      }
      if (parentContext == null) {
        parentContext = this._endedSpanContexts.get(span.parentId);
      }
    }

    const attributes: Record<string, any> = {};
    if (span.sanitizedClassName) {
      attributes.entryPoint = span.sanitizedClassName;
    }
    for (const [key, value] of Object.entries(span.attributes)) {
      attributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
    }

    const remoteSpan = this._tracing!.startSpan({
      name: span.name,
      op: span.op ?? 'function',
      attributes,
      parentContext,
    });
    this._spanMap.set(span, remoteSpan);
    this._idToSpan.set(span.id, span);
  }

  private _endRemoteSpan(span: TracingSpan): void {
    const remoteSpan = this._spanMap.get(span);
    if (remoteSpan) {
      if (remoteSpan.spanContext != null) {
        this._endedSpanContexts.set(span.id, remoteSpan.spanContext);
        this._evictEndedContexts();
      }
      remoteSpan.end();
      this._spanMap.delete(span);
      this._idToSpan.delete(span.id);
    }
  }

  /**
   * Replays a buffered flush that was queued before the processor was registered.
   * For spans that started AND ended before registration, replays both events.
   */
  private _replayFlush(span: TracingSpan, isEnd: boolean): void {
    if (!isEnd) {
      this._startRemoteSpan(span);
      if (span.endTs != null) {
        this._endRemoteSpan(span);
      }
    } else {
      if (!this._spanMap.has(span)) {
        this._startRemoteSpan(span);
      }
      this._endRemoteSpan(span);
    }
  }

  private _evictEndedContexts(): void {
    if (this._endedSpanContexts.size <= MAX_ENDED_CONTEXTS) {
      return;
    }
    const iterator = this._endedSpanContexts.keys();
    while (this._endedSpanContexts.size > MAX_ENDED_CONTEXTS) {
      const oldest = iterator.next();
      if (oldest.done) {
        break;
      }
      this._endedSpanContexts.delete(oldest.value);
    }
  }
}
