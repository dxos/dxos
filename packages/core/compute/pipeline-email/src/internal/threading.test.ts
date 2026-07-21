//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { deriveThreadId, normalizeSubject } from './threading';

describe('threading', () => {
  test('normalizeSubject strips reply/forward prefixes and normalizes', ({ expect }) => {
    expect(normalizeSubject('Re: Q2 Report')).toBe('q2 report');
    expect(normalizeSubject('FW: Fwd:  Re: Q2   Report ')).toBe('q2 report');
    expect(normalizeSubject('Q2 Report')).toBe('q2 report');
  });

  test('deriveThreadId groups replies onto one thread', ({ expect }) => {
    const original = Message.make({ sender: { email: 'a@x.com' }, properties: { subject: 'Deal terms' } });
    const reply = Message.make({ sender: { email: 'b@x.com' }, properties: { subject: 'RE: Deal terms' } });
    expect(deriveThreadId(original)).toBe(deriveThreadId(reply));
  });

  test('deriveThreadId falls back for missing subject', ({ expect }) => {
    const message = Message.make({ sender: { email: 'a@x.com' } });
    expect(deriveThreadId(message)).toBe('no-subject');
  });
});
