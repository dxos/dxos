//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { IBKR_CONNECTOR_ID, IBKR_SOURCE } from '../constants';
import { createIbkrConnectorEntry } from './connector';

describe('IBKR connector', () => {
  test('onSubmit maps token→AccessToken.token and queryId→AccessToken.account', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const entry = createIbkrConnectorEntry();
        const connector = { id: IBKR_CONNECTOR_ID, source: IBKR_SOURCE, label: 'Interactive Brokers' };

        const result = yield* entry.credentialForm.onSubmit({
          values: { token: 'flex-token-abc', queryId: 'QID-9' },
          connector,
        });

        expect(result.kind).toBe('complete');
        expect(result.accessToken.source).toBe(IBKR_SOURCE);
        // The Flex token maps to AccessToken.token (the secret).
        expect(result.accessToken.token).toBe('flex-token-abc');
        // The Flex query ID maps to AccessToken.account (non-secret, readable by AI tools).
        expect(result.accessToken.account).toBe('QID-9');
        // Connection references the access token and uses the connector id.
        expect(result.connection.connectorId).toBe(IBKR_CONNECTOR_ID);
      }),
    ));

  test('onSubmit rejects whitespace-only token or queryId', ({ expect }) => {
    const entry = createIbkrConnectorEntry();
    const connector = { id: IBKR_CONNECTOR_ID, label: 'Interactive Brokers' };
    return expect(
      EffectEx.runPromise(entry.credentialForm.onSubmit({ values: { token: '   ', queryId: '   ' }, connector })),
    ).rejects.toThrow('requires both Flex token and Flex query ID');
  });

  test('onSubmit trims whitespace from token and queryId', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const entry = createIbkrConnectorEntry();
        const connector = { id: IBKR_CONNECTOR_ID, label: 'Interactive Brokers' };

        const result = yield* entry.credentialForm.onSubmit({
          values: { token: '  padded-token  ', queryId: '  QID-42  ' },
          connector,
        });

        expect(result.kind).toBe('complete');
        expect(result.accessToken.token).toBe('padded-token');
        expect(result.accessToken.account).toBe('QID-42');
      }),
    ));
});
