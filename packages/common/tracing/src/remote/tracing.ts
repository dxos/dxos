//
// Copyright 2024 DXOS.org
//

interface TracingMethods {
  startSpan: <T>(context: any, callback: (span?: any) => T) => T;
  startSpanManual: <T>(context: any, callback: (span?: any, finish?: () => void) => T) => T;
}

/**
 * Allows traces to be recorded within SDK code without requiring specific consumers.
 */
// TODO(wittjosiah): Should probably just use otel. Use `any` for now to not depend on Sentry directly.
export class RemoteTracing implements TracingMethods {
  private _tracing: TracingMethods | undefined;

  async registerProcessor(processor: TracingMethods) {
    this._tracing = processor;
  }

  startSpan<T>(context: any, callback: (span?: any) => T) {
    return this._tracing ? this._tracing.startSpan(context, callback) : callback();
  }

  startSpanManual<T>(context: any, callback: (span?: any, finish?: () => void) => T) {
    return this._tracing ? this._tracing.startSpanManual(context, callback) : callback();
  }
}
