//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import {
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  InvitationCodeSchema,
  RedeemInvitationCodeRequestSchema,
} from './edge.ts';

describe('InvitationCodeSchema', () => {
  test('accepts well-formed codes', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(decode('AB12CDEF')).toBe('AB12CDEF');
    expect(decode('00000000')).toBe('00000000');
    expect(decode('ZZZZZZZZ')).toBe('ZZZZZZZZ');
  });

  test('rejects wrong length', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(() => decode('ABC')).toThrow();
    expect(() => decode('ABCDEFGHI')).toThrow();
  });

  test('rejects ambiguous characters (Crockford excludes I, L, O, U)', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(() => decode('IIIIIIII')).toThrow();
    expect(() => decode('LLLLLLLL')).toThrow();
    expect(() => decode('OOOOOOOO')).toThrow();
    expect(() => decode('UUUUUUUU')).toThrow();
  });

  test('alphabet has the expected length', () => {
    expect(INVITATION_CODE_ALPHABET).toHaveLength(32);
    expect(INVITATION_CODE_LENGTH).toBe(8);
  });
});

describe('RedeemInvitationCodeRequestSchema', () => {
  test('requires all three fields with valid code', () => {
    const decode = Schema.decodeUnknownSync(RedeemInvitationCodeRequestSchema);
    const request = decode({
      code: 'AB12CDEF',
      identityKey: 'identity-hex',
      email: 'user@example.com',
    });
    expect(request.code).toBe('AB12CDEF');
  });

  test('rejects malformed code in request', () => {
    const decode = Schema.decodeUnknownSync(RedeemInvitationCodeRequestSchema);
    expect(() =>
      decode({
        code: 'lowercase',
        identityKey: 'identity-hex',
        email: 'user@example.com',
      }),
    ).toThrow();
  });
});
