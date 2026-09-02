//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { describe, test } from 'vitest';

import type * as ObservabilityExtension from '../ObservabilityExtension';
import { AiSpanProcessor } from './AiObservability';

const setup = async ({
  allowContent = () => true,
  captureEnabled = () => true,
}: { allowContent?: (spaceId: string) => boolean; captureEnabled?: () => boolean } = {}) => {
  const generations: ObservabilityExtension.Generation[] = [];
  const turns: ObservabilityExtension.Turn[] = [];
  const toolCalls: ObservabilityExtension.ToolCall[] = [];
  const { BasicTracerProvider } = await import('@opentelemetry/sdk-trace-base');
  // Stands in for the realm's provider, which in the app carries this processor alongside the
  // exporter's.
  const provider = new BasicTracerProvider({
    spanProcessors: [
      new AiSpanProcessor({
        captureGeneration: (generation) => generations.push(generation),
        captureTurn: (turn) => turns.push(turn),
        captureToolCall: (toolCall) => toolCalls.push(toolCall),
        captureEnabled,
        allowContent,
      }),
    ],
  });
  return { generations, turns, toolCalls, tracer: provider.getTracer('test') };
};

/** A span without a space never reports content, so every content case here names one. */
const PLAINTEXT_SPACE = 'plaintext-space';

describe('AiSpanProcessor', () => {
  test('reports a gen_ai span as a generation', async ({ expect }) => {
    const { generations, tracer } = await setup();
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

    expect(generations).toHaveLength(1);
    expect(generations[0]).toMatchObject({
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      inputTokens: 10,
      outputTokens: 20,
      streaming: true,
      sessionId: 'feed-1',
      parameters: { temperature: 0.5 },
    });
    expect(generations[0]?.traceId).toBeTypeOf('string');
    expect(generations[0]?.latency).toBeTypeOf('number');
  });

  test('ignores spans without gen_ai attributes', async ({ expect }) => {
    const { generations, tracer } = await setup();
    tracer.startSpan('AiSession.createRequest').end();
    expect(generations).toHaveLength(0);
  });

  test('reduces errors to the exception class', async ({ expect }) => {
    const { generations, tracer } = await setup();
    const span = tracer.startSpan('LanguageModel.generateText', {
      attributes: { 'gen_ai.system': 'anthropic' },
    });
    span.recordException(new TypeError('the user secret'));
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'the user secret' });
    span.end();

    expect(generations[0]?.errorClass).toEqual('TypeError');
    expect(JSON.stringify(generations[0])).not.toContain('secret');
  });

  test('parses content attributes, carrying truncated JSON raw', async ({ expect }) => {
    const { generations, tracer } = await setup();
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'spaceId': PLAINTEXT_SPACE,
          'dxos.ai.input': JSON.stringify([{ role: 'user', content: 'hi' }]),
          'dxos.ai.output': '[{"role":"assist', // Truncated mid-JSON.
        },
      })
      .end();

    expect(generations[0]?.content?.input).toEqual([{ role: 'user', content: 'hi' }]);
    expect(generations[0]?.content?.output).toEqual('[{"role":"assist');
  });

  test('marks a generation whose content was cut', async ({ expect }) => {
    const { generations, tracer } = await setup();
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'spaceId': PLAINTEXT_SPACE,
          'dxos.ai.output': '[{"role":"assist',
          'dxos.ai.truncated': true,
        },
      })
      .end();

    expect(generations[0]?.content?.truncated).toEqual(true);
  });

  test('reports the prompt-cache counts as metadata, even when content is denied', async ({ expect }) => {
    const { generations, tracer } = await setup({ allowContent: () => false });
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'gen_ai.usage.input_tokens': 3,
          'spaceId': 'encrypted-space',
          'dxos.ai.cache_read_tokens': 11,
          'dxos.ai.cache_write_tokens': 7,
        },
      })
      .end();

    expect(generations[0]).toMatchObject({ inputTokens: 3, cacheReadTokens: 11, cacheWriteTokens: 7 });
    expect(generations[0]?.content).toBeUndefined();
  });

  test('drops content the policy rejects, keeping metadata', async ({ expect }) => {
    const { generations, tracer } = await setup({ allowContent: (spaceId) => spaceId === PLAINTEXT_SPACE });
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'gen_ai.usage.input_tokens': 10,
          'spaceId': 'encrypted-space',
          'dxos.ai.input': JSON.stringify([{ role: 'user', content: 'private' }]),
          'dxos.ai.output': JSON.stringify([{ role: 'assistant', content: 'private' }]),
          'dxos.ai.tools': JSON.stringify([{ name: 'search' }]),
        },
      })
      .end();

    expect(generations[0]?.content).toBeUndefined();
    expect(generations[0]?.inputTokens).toEqual(10);
    expect(JSON.stringify(generations[0])).not.toContain('private');
  });

  test('denies content when the span carries no space, without consulting the policy', async ({ expect }) => {
    let asked = false;
    const { generations, tracer } = await setup({
      allowContent: () => {
        asked = true;
        return true;
      },
    });
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: {
          'gen_ai.system': 'anthropic',
          'gen_ai.usage.input_tokens': 10,
          'dxos.ai.input': JSON.stringify([{ role: 'user', content: 'private' }]),
        },
      })
      .end();

    expect(asked).toEqual(false);
    expect(generations[0]?.content).toBeUndefined();
    expect(generations[0]?.inputTokens).toEqual(10);
  });

  test('reports nothing at all while telemetry is off', async ({ expect }) => {
    const { generations, tracer } = await setup({ captureEnabled: () => false });
    tracer
      .startSpan('LanguageModel.generateText', {
        attributes: { 'gen_ai.system': 'anthropic', 'spaceId': PLAINTEXT_SPACE },
      })
      .end();

    expect(generations).toHaveLength(0);
  });

  test('reads the opt-in per span, so a mid-session toggle takes effect', async ({ expect }) => {
    let enabled = false;
    const { generations, tracer } = await setup({ captureEnabled: () => enabled });
    const emit = () => tracer.startSpan('LanguageModel.generateText', { attributes: { 'gen_ai.system': 'a' } }).end();

    emit();
    expect(generations).toHaveLength(0);
    enabled = true;
    emit();
    expect(generations).toHaveLength(1);
  });

  test('reports a turn span with its prompt and messages', async ({ expect }) => {
    const { generations, turns, tracer } = await setup();
    tracer
      .startSpan('AiSession.createRequest', {
        attributes: {
          'dxos.ai.kind': 'turn',
          'dxos.ai.session_id': 'feed-1',
          'spaceId': PLAINTEXT_SPACE,
          'dxos.ai.input': JSON.stringify('hi'),
          'dxos.ai.output': JSON.stringify([{ role: 'assistant', blocks: [{ type: 'text', text: 'hello' }] }]),
        },
      })
      .end();

    expect(generations).toHaveLength(0);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      spanName: 'AiSession.createRequest',
      sessionId: 'feed-1',
      content: { input: 'hi', output: [{ role: 'assistant', blocks: [{ type: 'text', text: 'hello' }] }] },
    });
  });

  test('reports a tool span named after the tool it ran', async ({ expect }) => {
    const { toolCalls, tracer } = await setup();
    tracer
      .startSpan('callTool', {
        attributes: {
          'dxos.ai.kind': 'tool',
          'dxos.ai.name': 'Echo',
          'spaceId': PLAINTEXT_SPACE,
          'dxos.ai.input': JSON.stringify({ value: 'hello' }),
          'dxos.ai.output': JSON.stringify({ value: 'hello' }),
        },
      })
      .end();

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toMatchObject({
      spanName: 'Echo',
      content: { input: { value: 'hello' }, output: { value: 'hello' } },
    });
  });

  test('applies the content policy to turns and tool calls as to model calls', async ({ expect }) => {
    const { turns, toolCalls, tracer } = await setup({ allowContent: () => false });
    tracer
      .startSpan('AiSession.createRequest', {
        attributes: { 'dxos.ai.kind': 'turn', 'spaceId': PLAINTEXT_SPACE, 'dxos.ai.input': '"secret"' },
      })
      .end();
    // No space at all: denied before the policy is even asked.
    tracer.startSpan('callTool', { attributes: { 'dxos.ai.kind': 'tool', 'dxos.ai.input': '"secret"' } }).end();

    expect(turns[0]?.content).toBeUndefined();
    expect(toolCalls[0]?.content).toBeUndefined();
    expect(JSON.stringify([turns, toolCalls])).not.toContain('secret');
  });

  test('survives a sink that throws', async ({ expect }) => {
    const { BasicTracerProvider } = await import('@opentelemetry/sdk-trace-base');
    const provider = new BasicTracerProvider({
      spanProcessors: [
        new AiSpanProcessor({
          captureGeneration: () => {
            throw new Error('sink exploded');
          },
          captureTurn: () => {},
          captureToolCall: () => {},
          captureEnabled: () => true,
          allowContent: () => true,
        }),
      ],
    });
    const span = provider.getTracer('test').startSpan('LanguageModel.generateText', {
      attributes: { 'gen_ai.system': 'anthropic' },
    });

    // `onEnd` runs inside `end()`; an escaping error would fail the model call's own fiber.
    expect(() => span.end()).not.toThrow();
  });
});
