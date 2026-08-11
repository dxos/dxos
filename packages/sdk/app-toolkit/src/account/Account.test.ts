//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Account from './Account';

describe('access codes', () => {
  test('accepts hyphenated, bare, and lower-case forms', () => {
    expect(Account.isValidAccessCodeFormat('ABCD2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('ABCD-2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('abcd-2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('  ABCD-2345  ')).toBe(true);
  });

  test('forgives hyphen placement — normalization strips them all', () => {
    expect(Account.isValidAccessCodeFormat('ABC-D2345')).toBe(true);
    expect(Account.isValidAccessCodeFormat('AB-CD-23-45')).toBe(true);
  });

  test('rejects wrong lengths and ambiguous letters', () => {
    expect(Account.isValidAccessCodeFormat('ABCD234')).toBe(false);
    expect(Account.isValidAccessCodeFormat('ABCD23456')).toBe(false);
    // I, L, O and U are absent from the Crockford alphabet.
    expect(Account.isValidAccessCodeFormat('ABCI2345')).toBe(false);
    expect(Account.isValidAccessCodeFormat('')).toBe(false);
  });

  test('normalizes to the canonical form hub-service matches', () => {
    expect(Account.normalizeAccessCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(Account.normalizeAccessCode('ABCD2345')).toBe('ABCD2345');
  });
});

describe('accountErrorType', () => {
  test('reads the hub discriminator from the cause chain', () => {
    const hubFailure = Object.assign(new Error('redemption failed'), {
      data: { type: 'email_already_registered' },
    });
    expect(Account.accountErrorType(hubFailure)).toBe('email_already_registered');
    expect(Account.accountErrorType(new Account.AccountRedemptionError({ cause: hubFailure }))).toBe(
      'email_already_registered',
    );
    expect(Account.accountErrorType(new Error('plain'))).toBeUndefined();
  });
});
