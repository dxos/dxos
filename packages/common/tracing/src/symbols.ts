//
// Copyright 2023 DXOS.org
//

export const symbolTracingContext = Symbol('dxos.tracing.context');

export type TracingContext = {
  infoProperties: Record<string, {}>;
  metricsProperties: Record<string, {}>;
};

export const getTracingContext = (target: any): TracingContext => {
  return ((target[symbolTracingContext] as TracingContext | undefined) ??= {
    infoProperties: {},
    metricsProperties: {},
  });
};

export const TRACE_SPAN_ATTRIBUTE = 'dxos.trace-span';
