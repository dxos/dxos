//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { IDEOGRAM_CONNECTOR_ID, IDEOGRAM_SOURCE } from '../constants';
import { createIdeogramConnectorEntry } from './connector';

describe('ideogram connector', () => {
  const entry = createIdeogramConnectorEntry();
  const connector = { id: IDEOGRAM_CONNECTOR_ID, label: 'Ideogram' };

  test('builds an AccessToken + Connection from the API key', ({ expect }) => {
    const result = Effect.runSync(entry.credentialForm.onSubmit({ values: { token: '  sk-abc  ' }, connector }));
    expect(result.kind).toBe('complete');
    expect(result.accessToken.source).toBe(IDEOGRAM_SOURCE);
    expect(result.accessToken.token).toBe('sk-abc');
    expect(result.connection.connectorId).toBe(IDEOGRAM_CONNECTOR_ID);
    expect(result.connection.accessToken.target?.token).toBe('sk-abc');
  });

  test('rejects an empty API key', ({ expect }) => {
    expect(() => Effect.runSync(entry.credentialForm.onSubmit({ values: { token: '  ' }, connector }))).toThrow();
  });
});
