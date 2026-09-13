//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { HIGGSFIELD_CONNECTOR_ID, HIGGSFIELD_SOURCE } from '../constants.ts';
import { createHiggsfieldConnectorEntry } from './connector.ts';

describe('higgsfield connector', () => {
  const entry = createHiggsfieldConnectorEntry();
  const connector = { id: HIGGSFIELD_CONNECTOR_ID, label: 'Higgsfield' };

  test('joins key id and secret into one AccessToken', ({ expect }) => {
    const result = Effect.runSync(
      entry.credentialForm.onSubmit({ values: { keyId: ' kid ', keySecret: ' sec ' }, connector }),
    );
    expect(result.kind).toBe('complete');
    expect(result.accessToken.source).toBe(HIGGSFIELD_SOURCE);
    expect(result.accessToken.token).toBe('kid:sec');
    expect(result.connection.connectorId).toBe(HIGGSFIELD_CONNECTOR_ID);
    expect(result.connection.accessToken.target?.token).toBe('kid:sec');
  });

  test('rejects a missing id or secret', ({ expect }) => {
    expect(() =>
      Effect.runSync(entry.credentialForm.onSubmit({ values: { keyId: 'kid', keySecret: ' ' }, connector })),
    ).toThrow();
    expect(() =>
      Effect.runSync(entry.credentialForm.onSubmit({ values: { keyId: '', keySecret: 'sec' }, connector })),
    ).toThrow();
  });
});
