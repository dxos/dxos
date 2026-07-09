//
// Copyright 2023 DXOS.org
//

import type { AddLinkOptions } from './api';
import { BUFFERED_PREFIX, BufferingTracingBackend } from './buffering-backend';
import { DiagnosticsManager } from './diagnostic';
import { DiagnosticsChannel } from './diagnostics-channel';
import { RemoteMetrics } from './remote/metrics';
import type { RemoteSpan, StartSpanOptions, TracingBackend } from './tracing-types';

export class TraceProcessor {
  public readonly diagnostics = new DiagnosticsManager();
  public readonly diagnosticsChannel = new DiagnosticsChannel();
  public readonly remoteMetrics = new RemoteMetrics();

  readonly #bufferingBackend = new BufferingTracingBackend();
  #activeBackend: TracingBackend = this.#bufferingBackend;

  /**
   * Tracing backend. Initially a buffering backend that records spans;
   * once the observability package sets a real backend, the buffer is drained
   * and a thin translating wrapper is installed that resolves stale buffered
   * parent IDs still held by in-flight {@link Context} objects.
   *
   * The wrapper only allocates when a `buffered-*` parent is actually encountered;
   * the common path is a single `startsWith` check and direct passthrough.
   */
  get tracingBackend(): TracingBackend {
    return this.#activeBackend;
  }

  set tracingBackend(backend: TracingBackend | undefined) {
    if (!backend || backend === this.#bufferingBackend) {
      this.#bufferingBackend.clear();
      this.#activeBackend = this.#bufferingBackend;
      return;
    }
    const idMap = this.#bufferingBackend.drain(backend);
    this.#activeBackend = {
      startSpan: (options: StartSpanOptions): RemoteSpan => {
        const parent = options.parentContext;
        if (parent?.traceparent.startsWith(BUFFERED_PREFIX)) {
          const translated = idMap.get(parent.traceparent);
          if (translated) {
            return backend.startSpan({ ...options, parentContext: translated });
          }
        }
        return backend.startSpan(options);
      },
    };
  }

  private _instanceTag: string | null = null;

  constructor() {
    if (DiagnosticsChannel.supported) {
      this.diagnosticsChannel.serve(this.diagnostics);
    }
    this.diagnosticsChannel.unref();
  }

  setInstanceTag(tag: string): void {
    this._instanceTag = tag;
    this.diagnostics.setInstanceTag(tag);
  }

  // TODO(burdon): Not implemented.
  addLink(parent: any, child: any, opts: AddLinkOptions): void {}
}

export const TRACE_PROCESSOR: TraceProcessor = ((globalThis as any).TRACE_PROCESSOR ??= new TraceProcessor());

export const sanitizeClassName = (className: string) => {
  let name = className.replace(/^_+/, '');
  const SANITIZE_REGEX = /[^_](\d+)$/;
  const m = name.match(SANITIZE_REGEX);
  if (m) {
    name = name.slice(0, -m[1].length);
  }
  return name;
};
