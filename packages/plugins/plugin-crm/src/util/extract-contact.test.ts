//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EMAIL_FIXTURES, makeEmailMessage } from '../testing';
import { extractContactFromMessage } from './extract-contact';

const byId = (id: (typeof EMAIL_FIXTURES)[number]['id']) => {
  const fixture = EMAIL_FIXTURES.find((f) => f.id === id);
  if (!fixture) {
    throw new Error(`Missing email fixture: ${id}`);
  }
  return fixture;
};

describe('extractContactFromMessage', () => {
  test('email #1 — Madeline Ahern (corporate)', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('madeline-ahern')));

    expect(extract.fullName).toBe('Madeline Ahern');
    expect(extract.email).toBe('mahern@kirkconsult.com');
    expect(extract.phone).toBe('(510) 393-7703');
    expect(extract.orgDomain).toBe('kirkconsult.com');
    expect(extract.isFreeMailDomain).toBe(false);
    // Pragmatic: orgName is a best-effort fallback when no better source exists.
    expect(extract.orgName).toBeDefined();
  });

  test('email #2 — David Joerg (free-mail)', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('david-joerg')));

    expect(extract.fullName).toBe('David Joerg');
    expect(extract.email).toBe('dsjoerg@gmail.com');
    expect(extract.orgDomain).toBe('gmail.com');
    expect(extract.isFreeMailDomain).toBe(true);
    // Free-mail domain must not yield an organization name.
    expect(extract.orgName).toBeUndefined();
  });

  test('email #3 — Michael Ng (rich signature)', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('michael-ng')));

    expect(extract.fullName).toBe('Michael Ng');
    expect(extract.email).toBe('Michael.Ng@kobrekim.com');
    expect(extract.phone).toBe('+1 415 582 4803');
    expect(extract.orgDomain).toBe('kobrekim.com');
    expect(extract.isFreeMailDomain).toBe(false);

    expect(extract.urls).toBeDefined();
    expect(extract.urls!).toContain('www.kobrekim.com');

    expect(extract.locations).toBeDefined();
    expect(extract.locations!).toContain('New York');
    expect(extract.locations!).toContain('San Francisco');
    expect(extract.locations!).toContain('London');
  });
});
