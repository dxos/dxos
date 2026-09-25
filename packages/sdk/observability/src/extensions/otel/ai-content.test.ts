//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { describe, expect, test } from 'vitest';

import { SpanAttributes } from '@dxos/effect';

import { AiContentStrippingSpanProcessor, withoutAiContent } from './ai-content.ts';

const attributes = {
  'gen_ai.request.model': 'claude',
  [SpanAttributes.AI.kind]: 'turn',
  [SpanAttributes.AI.truncated]: true,
  [SpanAttributes.AI.input]: '[{"role":"user"}]',
  [SpanAttributes.AI.output]: '[{"role":"assistant"}]',
  [SpanAttributes.AI.tools]: '["search"]',
};

describe('ai-content', () => {
  test('drops the prompt, the response, and the tool names, and nothing else', () => {
    expect(withoutAiContent(attributes)).toEqual({
      'gen_ai.request.model': 'claude',
      [SpanAttributes.AI.kind]: 'turn',
      [SpanAttributes.AI.truncated]: true,
    });
  });

  test('forwards a stripped view and leaves the span other processors read intact', () => {
    const forwarded: ReadableSpan[] = [];
    const processor = new AiContentStrippingSpanProcessor({
      onStart: () => {},
      onEnd: (span) => forwarded.push(span),
      forceFlush: async () => {},
      shutdown: async () => {},
    });
    const span = {
      name: 'AiSession.createRequest',
      spanContext: () => ({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), traceFlags: 1 }),
      status: { code: SpanStatusCode.UNSET },
      attributes,
    } as unknown as ReadableSpan;

    processor.onEnd(span);

    expect(forwarded[0].attributes).not.toHaveProperty(SpanAttributes.AI.input);
    expect(forwarded[0].spanContext().spanId).toEqual('b'.repeat(16));
    expect(span.attributes).toHaveProperty(SpanAttributes.AI.input);
  });
});
