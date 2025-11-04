//
// Copyright 2023 DXOS.org
//

import { type InfoOptions } from './api';

export const symbolTracingContext = Symbol('dxos.tracing.context');

export type TracingContext = {
  infoProperties: Record<
    string,
    {
      options: InfoOptions;
    }
  >;
  metricsProperties: Record<string, {}>;
};

export const getTracingContext = (target: any): TracingContext =>
  ((target[symbolTracingContext] as TracingContext | undefined) ??= {
    infoProperties: {},
    metricsProperties: {},
  });

export const TRACE_SPAN_ATTRIBUTE = 'dxos.trace-span';
