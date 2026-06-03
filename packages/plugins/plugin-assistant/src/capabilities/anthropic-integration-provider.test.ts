//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test, vi } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';

import { type IntegrationProviderEntry } from '@dxos/plugin-integration';

import {
  ANTHROPIC_LABEL,
  ANTHROPIC_PROVIDER_ID,
  ANTHROPIC_SOURCE,
  anthropicCredentialForm,
} from './anthropic-integration-provider';

const providerStub: IntegrationProviderEntry = {
  id: ANTHROPIC_PROVIDER_ID,
  source: ANTHROPIC_SOURCE,
  label: ANTHROPIC_LABEL,
  credentialForm: anthropicCredentialForm,
};

describe('Anthropic integration provider', () => {
  test('uses anthropic.com as the AccessToken source', ({ expect }) => {
    expect(ANTHROPIC_SOURCE).toBe('anthropic.com');
    expect(ANTHROPIC_PROVIDER_ID).toBe('anthropic');
    expect(ANTHROPIC_LABEL).toBe('Anthropic');
  });

  test('credentialForm.onSubmit returns kind=complete and binds source/providerId on a valid key', async ({
    expect,
  }) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    try {
      const result = await anthropicCredentialForm
        .onSubmit({
          values: { token: 'sk-ant-abc' },
          provider: providerStub,
          // Test stub: onSubmit does not touch the database; the coordinator passes the active space's db at runtime.
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
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    try {
      const exit = await Effect.exit(
        anthropicCredentialForm.onSubmit({
          values: { token: 'bad' },
          provider: providerStub,
          // Test stub: onSubmit does not touch the database; the coordinator passes the active space's db at runtime.
          db: undefined as never,
        }),
      ).pipe(runAndForwardErrors);
      expect(exit._tag).toBe('Failure');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('credentialForm.onSubmit dies on an empty token', async ({ expect }) => {
    const exit = await Effect.exit(
      anthropicCredentialForm.onSubmit({
        values: { token: '   ' },
        provider: providerStub as any,
        db: {} as any,
      }),
    ).pipe(runAndForwardErrors);
    expect(exit._tag).toBe('Failure');
  });
});
