//
// Copyright 2026 DXOS.org
//

import { ROOT_CONTEXT, context, trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { afterEach, describe, test } from 'vitest';

import { activeTraceContext } from './trace-context';
import { OtelTraces } from './traces';

describe('OtelTraces', () => {
  afterEach(() => context.disable());

  test('keeps the active span across an await', async ({ expect }) => {
    const traces = new OtelTraces({
      destinations: [],
      resource: resourceFromAttributes({}),
      getTags: () => ({}),
      spanSink: { post: () => {} },
    });
    const spanContext = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: 1 };

    await context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(activeTraceContext()).toEqual({ traceId: spanContext.traceId, spanId: spanContext.spanId });
    });
    expect(activeTraceContext()).toBeUndefined();
    await traces.close();
  });
});
