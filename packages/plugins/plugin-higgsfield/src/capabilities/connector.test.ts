//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import { HIGGSFIELD_CONNECTOR_ID, HIGGSFIELD_SOURCE } from '../constants.ts';
import { HiggsfieldCredentialError, createHiggsfieldConnectorEntry } from './connector.ts';

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

  test('rejects a missing id or secret as a typed failure, never a defect', ({ expect }) => {
    for (const values of [
      { keyId: 'kid', keySecret: ' ' },
      { keyId: '', keySecret: 'sec' },
    ]) {
      const exit = Effect.runSyncExit(entry.credentialForm.onSubmit({ values, connector }));
      expect(Exit.isFailure(exit)).toBe(true);
      const error = Effect.runSync(Effect.flip(entry.credentialForm.onSubmit({ values, connector })));
      expect(error).toBeInstanceOf(HiggsfieldCredentialError);
      expect(Effect.runSyncExit(entry.credentialForm.onValidate({ values, connector }))._tag).toBe('Failure');
    }
  });
});
