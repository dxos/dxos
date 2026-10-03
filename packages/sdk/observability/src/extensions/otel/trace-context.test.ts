//
// Copyright 2026 DXOS.org
//

import { ROOT_CONTEXT, context, trace } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace-web';
import { afterEach, describe, test } from 'vitest';

import { activeTraceContext, contextForTrace } from './trace-context.ts';

const TRACE = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' };

describe('trace-context', () => {
  afterEach(() => context.disable());

  test('reads the span active on this thread', ({ expect }) => {
    context.setGlobalContextManager(new StackContextManager().enable());
    expect(activeTraceContext()).toBeUndefined();
    context.with(contextForTrace(TRACE), () => {
      expect(activeTraceContext()).toEqual(TRACE);
    });
  });

  test('reads nothing without a context manager, rather than a bogus id', ({ expect }) => {
    expect(
      context.with(trace.setSpanContext(ROOT_CONTEXT, { ...TRACE, traceFlags: 1 }), activeTraceContext),
    ).toBeUndefined();
  });
});
