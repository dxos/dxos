export const symbolTracingContext = Symbol('dxos.tracing-context');

export type TracingContext = {
  infoProperties: Record<string, {}>,
}

export const getTracingContext = (target: any): TracingContext => {
  return target[symbolTracingContext] ??= {
    infoProperties: {},
  };
}

export const TRACE_SPAN_ATTRIBUTE = 'dxos.trace-span';