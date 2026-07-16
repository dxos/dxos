//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';
import { createTypefullyConnectorEntry } from './connector';

describe('Typefully connector', () => {
  test('onSubmit maps the API key to AccessToken.token and links Connection to connector', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const entry = createTypefullyConnectorEntry();
        const connector = { id: TYPEFULLY_CONNECTOR_ID, source: TYPEFULLY_SOURCE, label: 'Typefully' };

        const result = yield* entry.credentialForm.onSubmit({ values: { token: 'test-key' }, connector });

        expect(result.kind).toBe('complete');
        expect(result.accessToken.token).toBe('test-key');
        expect(result.accessToken.source).toBe(TYPEFULLY_SOURCE);
        // Connection links back to the connector; source lives on the AccessToken, not the Connection.
        expect(result.connection.connectorId).toBe(TYPEFULLY_CONNECTOR_ID);
        expect(result.connection.accessToken.target?.id).toBe(result.accessToken.id);
      }),
    ));

  test('onSubmit rejects an empty API key', ({ expect }) => {
    const entry = createTypefullyConnectorEntry();
    const connector = { id: TYPEFULLY_CONNECTOR_ID, label: 'Typefully' };
    return expect(
      EffectEx.runPromise(entry.credentialForm.onSubmit({ values: { token: '   ' }, connector })),
    ).rejects.toThrow('requires an API key');
  });
});
