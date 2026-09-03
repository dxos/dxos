//
// Copyright 2026 DXOS.org
//

import { type Tracer, trace } from '@opentelemetry/api';
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelTracesOptions, makeTracingBackend } from './traces-shared';

export type { OtelTracesOptions };

/**
 * Traces on a worker host that already owns the provider (`otel-cf-workers` registers one per
 * invocation and exports through the tail worker). This variant only routes `@dxos/tracing`
 * spans into it; registering a second provider would replace the host's and lose its export.
 */
export class OtelTraces {
  private readonly _tracer: Tracer;

  constructor(private readonly options: OtelTracesOptions) {
    this._tracer = trace.getTracer(
      'dxos-observability',
      this.options.resource.attributes[ATTR_SERVICE_VERSION]?.toString(),
    );
  }

  /** Every span is the host's to sample; there is nothing here to promote. */
  public promote(_traceId: string): void {}

  /** Export belongs to the host's processors, so there is nothing queued here to flush. */
  public async flush(): Promise<void> {}

  public async close(): Promise<void> {}

  public start(): void {
    log('trace processor registered');
    TRACE_PROCESSOR.tracingBackend = makeTracingBackend(this._tracer);
  }
}
