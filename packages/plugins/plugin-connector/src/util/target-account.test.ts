//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { checkTargetAccount, readTargetAccount, recordTargetAccount } from './target-account';

const SOURCE = 'gmail.com';

describe('target account', () => {
  test('records and reads the account a target syncs', () => {
    const target = makeTarget();
    expect(readTargetAccount(target, SOURCE)).toBeUndefined();

    recordTargetAccount(target, SOURCE, 'me@example.com');

    expect(readTargetAccount(target, SOURCE)).toBe('me@example.com');
    // Scoped per service: two providers can each record their own account on one object.
    expect(readTargetAccount(target, 'other.com')).toBeUndefined();
  });

  test('the first recorded account stands', () => {
    const target = makeTarget();
    recordTargetAccount(target, SOURCE, 'me@example.com');
    recordTargetAccount(target, SOURCE, 'someone-else@example.com');

    expect(Obj.getKeys(target, SOURCE)).toHaveLength(1);
    expect(readTargetAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('refuses only a contradiction', () => {
    const target = makeTarget();
    // Nothing recorded: no evidence either way, so bind and start fresh.
    expect(checkTargetAccount(target, SOURCE, 'me@example.com')).toBe('unknown');

    recordTargetAccount(target, SOURCE, 'me@example.com');

    expect(checkTargetAccount(target, SOURCE, 'me@example.com')).toBe('match');
    expect(checkTargetAccount(target, SOURCE, 'someone-else@example.com')).toBe('mismatch');
    // A credential that reports no account cannot contradict the record.
    expect(checkTargetAccount(target, SOURCE, undefined)).toBe('unknown');
    // Another service's credential says nothing about this one.
    expect(checkTargetAccount(target, 'other.com', 'me@other.com')).toBe('unknown');
  });
});

const makeTarget = () => Obj.make(Expando.Expando, { name: 'Inbox' });
