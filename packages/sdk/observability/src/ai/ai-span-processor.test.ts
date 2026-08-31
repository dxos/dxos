//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { describe, test } from 'vitest';

import { createAiTracerProvider } from './ai-span-processor';

type Captured = { event: string; properties: Record<string, unknown> };

const setup = () => {
  const events: Captured[] = [];
  const provider = createAiTracerProvider((event, properties) => events.push({ event, properties }));
  return { events, tracer: provider.getTracer('test') };
};

describe('AiSpanProcessor', () => {
  test('maps gen_ai spans to $ai_generation', ({ expect }) => {
    const { events, tracer } = setup();
    tracer
      .startSpan('LanguageModel.streamText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-sonnet-5',
          'gen_ai.request.temperature': 0.5,
          'gen_ai.usage.input_tokens': 10,
          'gen_ai.usage.output_tokens': 20,
          'dxos.ai.session_id': 'feed-1',
        },
      })
      .end();

    expect(events).toHaveLength(1);
    expect(events[0]?.event).toEqual('$ai_generation');
    expect(events[0]?.properties).toMatchObject({
      $ai_provider: 'anthropic',
      $ai_model: 'claude-sonnet-5',
      $ai_input_tokens: 10,
      $ai_output_tokens: 20,
      $ai_stream: true,
      $ai_session_id: 'feed-1',
      $ai_model_parameters: { temperature: 0.5 },
    });
    expect(events[0]?.properties.$ai_trace_id).toBeTypeOf('string');
    expect(events[0]?.properties.$ai_latency).toBeTypeOf('number');
  });

  test('ignores spans without gen_ai attributes', ({ expect }) => {
    const { events, tracer } = setup();
    tracer.startSpan('AiSession.createRequest').end();
    expect(events).toHaveLength(0);
  });

  test('reduces errors to the exception class', ({ expect }) => {
    const { events, tracer } = setup();
    const span = tracer.startSpan('LanguageModel.generateText', {
      attributes: { 'gen_ai.system': 'anthropic' },
    });
    span.recordException(new TypeError('the user secret'));
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'the user secret' });
    span.end();

    expect(events[0]?.properties.$ai_is_error).toEqual(true);
    expect(events[0]?.properties.$ai_error).toEqual('TypeError');
    expect(JSON.stringify(events[0]?.properties)).not.toContain('secret');
  });

  test('parses content attributes, forwarding truncated JSON raw', ({ expect }) => {
    const { events, tracer } = setup();
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'dxos.ai.input': JSON.stringify([{ role: 'user', content: 'hi' }]),
          'dxos.ai.output': '[{"role":"assist', // Truncated mid-JSON.
        },
      })
      .end();

    expect(events[0]?.properties.$ai_input).toEqual([{ role: 'user', content: 'hi' }]);
    expect(events[0]?.properties.$ai_output_choices).toEqual('[{"role":"assist');
  });
});
