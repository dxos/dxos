//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { DEEPSEEK_CONNECTOR_ID, DEEPSEEK_SOURCE } from '../constants.ts';
import { createDeepSeekConnectorEntry } from './connector.ts';

describe('deepseek connector', () => {
  const connector = { id: DEEPSEEK_CONNECTOR_ID, label: 'DeepSeek' };

  test('onSubmit builds an AccessToken + Connection from the API key', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const entry = createDeepSeekConnectorEntry();

        const result = yield* entry.credentialForm.onSubmit({ values: { token: '  sk-abc  ' }, connector });

        expect(result.kind).toBe('complete');
        expect(result.accessToken.source).toBe(DEEPSEEK_SOURCE);
        // Trimmed, so a pasted key with surrounding whitespace still authenticates.
        expect(result.accessToken.token).toBe('sk-abc');
        expect(result.connection.connectorId).toBe(DEEPSEEK_CONNECTOR_ID);
        expect(result.connection.accessToken.target?.token).toBe('sk-abc');
      }),
    ));

  test('onValidate rejects a whitespace-only key, so the dialog stays open with the message', ({ expect }) => {
    const entry = createDeepSeekConnectorEntry();
    return expect(
      EffectEx.runPromise(entry.credentialForm.onValidate({ values: { token: '  ' }, connector })),
    ).rejects.toThrow('requires an API key');
  });

  test('onSubmit rejects a whitespace-only key as a typed failure, never a defect', ({ expect }) => {
    const entry = createDeepSeekConnectorEntry();
    return expect(
      EffectEx.runPromise(entry.credentialForm.onSubmit({ values: { token: '  ' }, connector })),
    ).rejects.toThrow('requires an API key');
  });
});
