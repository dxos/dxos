//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as ObservabilityExtension from '../../observability-extension';
import { toAiGenerationProperties, toAiSpanProperties, toAiTraceProperties } from './llm-analytics';

const generation = (overrides: Partial<ObservabilityExtension.Generation> = {}): ObservabilityExtension.Generation => ({
  traceId: 'trace-1',
  spanId: 'span-1',
  spanName: 'LanguageModel.generateText',
  latency: 1.5,
  streaming: false,
  ...overrides,
});

describe('toAiGenerationProperties', () => {
  test('maps a generation onto PostHog LLM analytics', ({ expect }) => {
    const properties = toAiGenerationProperties(
      generation({
        parentSpanId: 'span-0',
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        sessionId: 'feed-1',
        parameters: { temperature: 0.5 },
        inputTokens: 3,
        outputTokens: 5,
        cacheReadTokens: 11,
        cacheWriteTokens: 7,
        streaming: true,
      }),
    );

    expect(properties).toEqual({
      $ai_trace_id: 'trace-1',
      $ai_span_id: 'span-1',
      $ai_parent_id: 'span-0',
      $ai_span_name: 'LanguageModel.generateText',
      $ai_provider: 'anthropic',
      $ai_model: 'claude-sonnet-5',
      $ai_session_id: 'feed-1',
      $ai_model_parameters: { temperature: 0.5 },
      $ai_input_tokens: 3,
      $ai_output_tokens: 5,
      $ai_cache_read_input_tokens: 11,
      $ai_cache_creation_input_tokens: 7,
      $ai_latency: 1.5,
      $ai_stream: true,
    });
  });

  test('omits what the generation does not carry', ({ expect }) => {
    expect(toAiGenerationProperties(generation())).toEqual({
      $ai_trace_id: 'trace-1',
      $ai_span_id: 'span-1',
      $ai_span_name: 'LanguageModel.generateText',
      $ai_latency: 1.5,
    });
  });

  test('carries content and its truncation marker', ({ expect }) => {
    const properties = toAiGenerationProperties(
      generation({
        content: {
          input: [{ role: 'user' }],
          output: '[{"role":"assist',
          tools: [{ name: 'search' }],
          truncated: true,
        },
      }),
    );

    expect(properties).toMatchObject({
      $ai_input: [{ role: 'user' }],
      $ai_output_choices: '[{"role":"assist',
      $ai_tools: [{ name: 'search' }],
      $ai_content_truncated: true,
    });
  });

  test('reports an error as both the flag and the class', ({ expect }) => {
    expect(toAiGenerationProperties(generation({ errorClass: 'TypeError' }))).toMatchObject({
      $ai_is_error: true,
      $ai_error: 'TypeError',
    });
  });
});

const aiSpan = (overrides: Partial<ObservabilityExtension.AiSpanBase> = {}): ObservabilityExtension.AiSpanBase => ({
  traceId: 'trace-1',
  spanId: 'span-1',
  spanName: 'AiSession.createRequest',
  latency: 12.5,
  ...overrides,
});

describe('toAiTraceProperties', () => {
  test('maps a turn onto the top-level trace event', ({ expect }) => {
    const properties = toAiTraceProperties(
      aiSpan({
        sessionId: 'feed-1',
        content: { input: 'Echo hello.', output: [{ role: 'assistant', blocks: [] }] },
      }),
    );

    expect(properties).toEqual({
      $ai_trace_id: 'trace-1',
      $ai_span_id: 'span-1',
      $ai_span_name: 'AiSession.createRequest',
      $ai_session_id: 'feed-1',
      $ai_latency: 12.5,
      $ai_input_state: 'Echo hello.',
      $ai_output_state: [{ role: 'assistant', blocks: [] }],
    });
  });

  test('reports an error as both the flag and the class', ({ expect }) => {
    expect(toAiTraceProperties(aiSpan({ errorClass: 'AiError' }))).toMatchObject({
      $ai_is_error: true,
      $ai_error: 'AiError',
    });
  });
});

describe('toAiSpanProperties', () => {
  test('maps a tool call onto a tool span under its parent', ({ expect }) => {
    const properties = toAiSpanProperties(
      aiSpan({
        spanName: 'Echo',
        parentSpanId: 'span-0',
        content: { input: { value: 'hello' }, output: { value: 'hello' }, truncated: true },
      }),
    );

    expect(properties).toEqual({
      $ai_trace_id: 'trace-1',
      $ai_span_id: 'span-1',
      $ai_parent_id: 'span-0',
      $ai_span_name: 'Echo',
      $ai_span_type: 'tool',
      $ai_latency: 12.5,
      $ai_input_state: { value: 'hello' },
      $ai_output_state: { value: 'hello' },
      $ai_content_truncated: true,
    });
  });

  test('omits the states when the policy denied content', ({ expect }) => {
    const properties = toAiSpanProperties(aiSpan({ spanName: 'Echo' }));
    expect(properties).not.toHaveProperty('$ai_input_state');
    expect(properties).not.toHaveProperty('$ai_output_state');
  });
});
