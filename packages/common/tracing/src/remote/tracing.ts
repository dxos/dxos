//
// Copyright 2024 DXOS.org
//

import { type TracingSpan } from '../trace-processor';

type RemoteSpan = {
  end: () => void;
};

type StartSpanOptions = {
  name: string;
  op?: string;
  attributes?: Record<string, any>;
};

interface TracingMethods {
  startSpan: (options: StartSpanOptions) => RemoteSpan;
}

/**
 * Allows traces to be recorded within SDK code without requiring specific consumers.
 */
// TODO(wittjosiah): Should probably just use otel. Use `any` for now to not depend on Sentry directly.
export class RemoteTracing {
  private _tracing: TracingMethods | undefined;
  private _spanMap = new Map<TracingSpan, RemoteSpan>();

  registerProcessor(processor: TracingMethods) {
    this._tracing = processor;
  }

  flushSpan(span: TracingSpan) {
    if (!this._tracing) {
      return;
    }

    if (!span.endTs) {
      const remoteSpan = this._tracing.startSpan({
        name: span.methodName,
        op: span.op ?? 'function',
        attributes: span.attributes,
      });
      this._spanMap.set(span, remoteSpan);
    } else {
      const remoteSpan = this._spanMap.get(span);
      if (remoteSpan) {
        remoteSpan.end();
        this._spanMap.delete(span);
      }
    }
  }
}
