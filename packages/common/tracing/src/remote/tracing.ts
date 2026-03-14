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

/**
 * Allows traces to be recorded within SDK code without requiring specific consumers.
 */
export class RemoteTracing {
  private _tracing: TracingMethods | undefined;
  private _spanMap = new Map<TracingSpan, RemoteSpan>();
  private _idToSpan = new Map<number, TracingSpan>();

  registerProcessor(processor: TracingMethods): void {
    this._tracing = processor;
  }

  /** Returns the opaque OTEL context for the given DXOS span ID, if one exists. */
  getSpanContext(spanId: number): unknown | undefined {
    const tracingSpan = this._idToSpan.get(spanId);
    if (tracingSpan) {
      return this._spanMap.get(tracingSpan)?.spanContext;
    }
    return undefined;
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
    if (!this._tracing) {
      return;
    }

    if (!span.endTs) {
      let parentContext: unknown;
      if (span.parentId != null) {
        const parentTracingSpan = this._idToSpan.get(span.parentId);
        if (parentTracingSpan) {
          parentContext = this._spanMap.get(parentTracingSpan)?.spanContext;
        }
      }

      const attributes: Record<string, any> = {};
      if (span.sanitizedClassName) {
        attributes.entryPoint = span.sanitizedClassName;
      }
      for (const [key, value] of Object.entries(span.attributes)) {
        attributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
      }

      const remoteSpan = this._tracing.startSpan({
        name: span.name,
        op: span.op ?? 'function',
        attributes,
        parentContext,
      });
      this._spanMap.set(span, remoteSpan);
      this._idToSpan.set(span.id, span);
    } else {
      const remoteSpan = this._spanMap.get(span);
      if (remoteSpan) {
        remoteSpan.end();
        this._spanMap.delete(span);
        this._idToSpan.delete(span.id);
      }
    }
  }
}
