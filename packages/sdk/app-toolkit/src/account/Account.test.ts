//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config } from '@dxos/client';
import { DEFAULT_HUB_URL } from '@dxos/client-protocol';

import * as Account from './Account.ts';

describe('getHubUrl', () => {
  test('prefers the bundler-set app env over the services key', ({ expect }) => {
    const config = new Config({
      runtime: { app: { env: { DX_HUB_URL: 'https://hub.env/' } }, services: { hub: { url: 'https://hub.svc/' } } },
    });
    expect(Account.getHubUrl({ config })).toBe('https://hub.env/');
  });

  test('falls back to the services key, then to the default', ({ expect }) => {
    expect(
      Account.getHubUrl({ config: new Config({ runtime: { services: { hub: { url: 'https://hub.svc/' } } } }) }),
    ).toBe('https://hub.svc/');
    // The case the CLI hits: no bundler ever wrote `runtime.app.env`.
    expect(Account.getHubUrl({ config: new Config() })).toBe(DEFAULT_HUB_URL);
  });
});

describe('access codes', () => {
  test('accepts hyphenated, bare, and lower-case forms', ({ expect }) => {
    expect(Account.isValidAccessCodeFormat('ABCD2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('ABCD-2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('abcd-2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('  ABCD-2345  ')).toBe(true);
  });

  test('forgives hyphen placement — normalization strips them all', ({ expect }) => {
    expect(Account.isValidAccessCodeFormat('ABC-D2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('AB-CD-23-45')).toBe(true);
  });

  test('rejects wrong lengths and ambiguous letters', ({ expect }) => {
    expect(Account.isValidAccessCodeFormat('ABCD234')).toBe(false);
    expect(Account.isValidAccessCodeFormat('ABCD23456')).toBe(false);
    // I, L, O and U are absent from the Crockford alphabet.
    expect(Account.isValidAccessCodeFormat('ABCI2345')).toBe(false);
    expect(Account.isValidAccessCodeFormat('')).toBe(false);
  });

  test('normalizes to the canonical form hub-service matches', ({ expect }) => {
    expect(Account.normalizeAccessCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(Account.normalizeAccessCode('ABCD2345')).toBe('ABCD2345');
  });
});

describe('accountErrorType', () => {
  test('reads the hub discriminator from the cause chain', ({ expect }) => {
    const hubFailure = Object.assign(new Error('redemption failed'), {
      data: { type: 'email_already_registered' },
    });
    expect(Account.accountErrorType(hubFailure)).toBe('email_already_registered');
    expect(Account.accountErrorType(new Account.AccountRedemptionError({ cause: hubFailure }))).toBe(
      'email_already_registered',
    );
    expect(Account.accountErrorType(new Error('plain'))).toBeUndefined();
  });

  test('ignores unknown discriminators and terminates on cyclic causes', ({ expect }) => {
    const unknown = Object.assign(new Error('other'), { data: { type: 'not_an_account_error' } });
    expect(Account.accountErrorType(unknown)).toBeUndefined();

    const cyclic = new Error('a');
    cyclic.cause = cyclic;
    expect(Account.accountErrorType(cyclic)).toBeUndefined();
  });
});
