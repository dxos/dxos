//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { DEEPSEEK_CONNECTOR_ID, DEEPSEEK_SOURCE } from '../constants';
import { createDeepSeekConnectorEntry } from './connector';

describe('deepseek connector', () => {
  const entry = createDeepSeekConnectorEntry();
  const connector = { id: DEEPSEEK_CONNECTOR_ID, label: 'DeepSeek' };

  test('builds an AccessToken + Connection from the API key', ({ expect }) => {
    const result = Effect.runSync(entry.credentialForm.onSubmit({ values: { token: '  sk-abc  ' }, connector }));
    expect(result.kind).toBe('complete');
    expect(result.accessToken.source).toBe(DEEPSEEK_SOURCE);
    expect(result.accessToken.token).toBe('sk-abc');
    expect(result.connection.connectorId).toBe(DEEPSEEK_CONNECTOR_ID);
    expect(result.connection.accessToken.target?.token).toBe('sk-abc');
  });

  test('rejects an empty API key', ({ expect }) => {
    expect(() => Effect.runSync(entry.credentialForm.onSubmit({ values: { token: '  ' }, connector }))).toThrow();
  });
});
