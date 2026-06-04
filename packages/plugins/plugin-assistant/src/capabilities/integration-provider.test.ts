//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test, vi } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';
import { IntegrationProvider as IntegrationProviderCapability } from '@dxos/plugin-integration';

import { ANTHROPIC_PROVIDER_ID, ANTHROPIC_SOURCE } from '../constants';
import activate from './integration-provider';

const anthropicProvider = async () => {
  const capability = await Effect.runPromise(activate());
  if (capability.interface.identifier !== IntegrationProviderCapability.identifier) {
    throw new Error('expected IntegrationProvider contribution');
  }
  const entry = capability.implementation.find((provider) => provider.id === ANTHROPIC_PROVIDER_ID);
  if (!entry?.credentialForm) {
    throw new Error('expected Anthropic credentialForm');
  }
  return entry;
};

describe('Anthropic integration provider', () => {
  test('uses anthropic.com as the AccessToken source', ({ expect }) => {
    expect(ANTHROPIC_SOURCE).toBe('anthropic.com');
    expect(ANTHROPIC_PROVIDER_ID).toBe('anthropic');
  });

  test('credentialForm.onSubmit returns kind=complete and binds source/providerId on a valid key', async ({
    expect,
  }) => {
    const provider = await anthropicProvider();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    try {
      const result = await provider
        .credentialForm!.onSubmit({
          values: { token: 'sk-ant-abc' },
          provider,
          db: undefined as never,
        })
        .pipe(runAndForwardErrors);
      expect(result.kind).toBe('complete');
      if (result.kind === 'complete') {
        expect(result.accessToken.source).toBe('anthropic.com');
        expect(result.accessToken.token).toBe('sk-ant-abc');
        expect(result.integration.providerId).toBe('anthropic');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('credentialForm.onSubmit dies when Anthropic rejects the key (401)', async ({ expect }) => {
    const provider = await anthropicProvider();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    try {
      const exit = await Effect.exit(
        provider.credentialForm!.onSubmit({
          values: { token: 'bad' },
          provider,
          db: undefined as never,
        }),
      ).pipe(runAndForwardErrors);
      expect(exit._tag).toBe('Failure');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('credentialForm.onSubmit dies on an empty token', async ({ expect }) => {
    const provider = await anthropicProvider();
    const exit = await Effect.exit(
      provider.credentialForm!.onSubmit({
        values: { token: '   ' },
        provider,
        db: undefined as never,
      }),
    ).pipe(runAndForwardErrors);
    expect(exit._tag).toBe('Failure');
  });
});
