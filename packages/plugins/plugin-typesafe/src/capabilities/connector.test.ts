//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { TYPESAFE_CONNECTOR_ID, TYPESAFE_SOURCE } from '../constants.ts';
import { createTypeSafeConnectorEntry } from './connector.ts';

describe('typesafe connector', () => {
  const connector = { id: TYPESAFE_CONNECTOR_ID, label: 'TypeSafe' };

  test('onSubmit builds an AccessToken + Connection from the API key', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const entry = createTypeSafeConnectorEntry();

        const result = yield* entry.credentialForm.onSubmit({ values: { token: '  ts-abc  ' }, connector });

        expect(result.kind).toBe('complete');
        // The source is what `CredentialsService` resolves the key by, so the layer finds it.
        expect(result.accessToken.source).toBe(TYPESAFE_SOURCE);
        // Trimmed, so a pasted key with surrounding whitespace still authenticates.
        expect(result.accessToken.token).toBe('ts-abc');
        expect(result.connection.connectorId).toBe(TYPESAFE_CONNECTOR_ID);
        expect(result.connection.accessToken.target?.token).toBe('ts-abc');
      }),
    ));

  test('onValidate rejects a whitespace-only key, so the dialog stays open with the message', ({ expect }) => {
    const entry = createTypeSafeConnectorEntry();
    return expect(
      EffectEx.runPromise(entry.credentialForm.onValidate({ values: { token: '  ' }, connector })),
    ).rejects.toThrow('requires an API key');
  });
});
