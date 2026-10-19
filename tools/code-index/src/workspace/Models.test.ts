//
// Copyright 2026 DXOS.org
//

import * as AiError from 'effect/ai/AiError';
import { createServer } from 'node:http';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Models from './Models.ts';

const ollama: Models.Selection = { provider: 'ollama', model: Models.DEFAULT_OLLAMA_MODEL };

const networkError = (url: string) =>
  new AiError.AiError({
    module: 'ChatCompletionsClient',
    method: 'generateText',
    reason: new AiError.NetworkError({
      reason: 'TransportError',
      request: { method: 'POST', url, urlParams: [], hash: undefined, headers: {} },
      description: 'connection refused',
    }),
  });

describe('Models', () => {
  test('a reachable Ollama is kept', ({ expect }) => {
    expect(Models.settle(ollama, { reachable: true, chosen: false, hasKey: true })).toEqual({ selection: ollama });
  });

  test('an unreachable Ollama falls back to Anthropic when a key is set and nothing was chosen', ({ expect }) => {
    const settled = Models.settle(ollama, { reachable: false, chosen: false, hasKey: true });
    expect(settled.selection).toEqual({ provider: 'anthropic', model: Models.DEFAULT_ANTHROPIC_MODEL });
    expect(settled.notice).toContain('using anthropic/');
  });

  test('an explicit choice is never switched', ({ expect }) => {
    const settled = Models.settle(ollama, { reachable: false, chosen: true, hasKey: true });
    expect(settled.selection).toEqual(ollama);
    expect(settled.notice).toContain('ollama serve');
  });

  test('without a key the user is told how to fix it', ({ expect }) => {
    const settled = Models.settle(
      { ...ollama, endpoint: 'http://gpu:11434' },
      { reachable: false, chosen: false, hasKey: false },
    );
    expect(settled.selection.provider).toBe('ollama');
    expect(settled.notice).toContain('http://gpu:11434');
    expect(settled.notice).toContain('--provider anthropic');
  });

  test('Anthropic is not probed', ({ expect }) => {
    const anthropic: Models.Selection = { provider: 'anthropic', model: Models.DEFAULT_ANTHROPIC_MODEL };
    expect(Models.settle(anthropic, { reachable: false, chosen: false, hasKey: false })).toEqual({
      selection: anthropic,
    });
  });

  test('either key variable counts', ({ expect }) => {
    expect(Models.hasAnthropicKey({ ANTHROPIC_API_KEY: 'x' })).toBe(true);
    expect(Models.hasAnthropicKey({ DX_ANTHROPIC_API_KEY: 'x' })).toBe(true);
    expect(Models.hasAnthropicKey({ DX_ANTHROPIC_API_KEY: '' })).toBe(false);
  });

  test('a refused Ollama call reads as advice', ({ expect }) => {
    expect(Models.explainFailure(networkError('http://localhost:11434/api/chat'))).toBe(
      'Cannot reach Ollama at http://localhost:11434: start it with `ollama serve`, or restart with --provider anthropic and DX_ANTHROPIC_API_KEY set.',
    );
    expect(Models.explainFailure(networkError('https://api.anthropic.com/v1/messages'))).toContain(
      'https://api.anthropic.com/v1/messages',
    );
    expect(Models.explainFailure(new Error('boom'))).toBeUndefined();
  });

  test('the probe keeps a path prefix on the endpoint', async ({ expect }) => {
    const server = createServer((request, response) => {
      response.statusCode = request.url === '/ollama/api/version' ? 200 : 404;
      response.end('{}');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      expect(await EffectEx.runPromise(Models.probe(`http://127.0.0.1:${port}/ollama/`))).toBe(true);
      expect(await EffectEx.runPromise(Models.probe(`http://127.0.0.1:${port}/ollama`))).toBe(true);
      expect(await EffectEx.runPromise(Models.probe(`http://127.0.0.1:${port}`))).toBe(false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('a closed port probes as unreachable', async ({ expect }) => {
    expect(await EffectEx.runPromise(Models.probe('http://127.0.0.1:9', '500 millis'))).toBe(false);
  });
});
