//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { INVITATION_PARAM, invitationUrl, parseInvitationCode } from './invitation.ts';

describe('invitation links', () => {
  test('a link from this app or Composer yields its code; bare text is the code itself', () => {
    expect(parseInvitationCode('https://composer.space/?spaceInvitationCode=abc123')).toBe('abc123');
    expect(parseInvitationCode(invitationUrl('xyz', 'https://example.test'))).toBe('xyz');
    expect(parseInvitationCode('  abc123  ')).toBe('abc123');
    expect(parseInvitationCode('https://composer.space/')).toBeUndefined();
    expect(parseInvitationCode('   ')).toBeUndefined();
  });

  test('a link carries the code in the parameter Composer reads', () => {
    const url = new URL(invitationUrl('a+b/c', 'https://example.test'));
    expect(url.origin).toBe('https://example.test');
    expect(url.searchParams.get(INVITATION_PARAM)).toBe('a+b/c');
  });
});
