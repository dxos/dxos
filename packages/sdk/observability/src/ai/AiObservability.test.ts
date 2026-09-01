//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { describe, test } from 'vitest';

import type * as ObservabilityExtension from '../observability-extension';
import { createAiTracerProvider } from './AiObservability';

const setup = async ({
  allowContent = () => true,
  captureEnabled = () => true,
}: { allowContent?: (spaceId: string) => boolean; captureEnabled?: () => boolean } = {}) => {
  const generations: ObservabilityExtension.Generation[] = [];
  const provider = await createAiTracerProvider({
    captureGeneration: (generation) => generations.push(generation),
    captureEnabled,
    allowContent,
  });
  return { generations, tracer: provider.getTracer('test') };
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
          'dxos.ai.space_id': PLAINTEXT_SPACE,
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
          'dxos.ai.space_id': PLAINTEXT_SPACE,
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
          'dxos.ai.space_id': 'encrypted-space',
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
          'dxos.ai.space_id': 'encrypted-space',
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
        attributes: { 'gen_ai.system': 'anthropic', 'dxos.ai.space_id': PLAINTEXT_SPACE },
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

  test('survives a sink that throws', async ({ expect }) => {
    const provider = await createAiTracerProvider({
      captureGeneration: () => {
        throw new Error('sink exploded');
      },
      captureEnabled: () => true,
      allowContent: () => true,
    });
    const span = provider.getTracer('test').startSpan('LanguageModel.generateText', {
      attributes: { 'gen_ai.system': 'anthropic' },
    });

    // `onEnd` runs inside `end()`; an escaping error would fail the model call's own fiber.
    expect(() => span.end()).not.toThrow();
  });
});
