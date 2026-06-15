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
  test('email #1 — corporate short signature', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('corporate-short')));

    expect(extract.fullName).toBe('Priya Adebayo');
    expect(extract.email).toBe('padebayo@ventura-advisors.example');
    expect(extract.phone).toBe('(555) 010-0149');
    expect(extract.orgDomain).toBe('ventura-advisors.example');
    expect(extract.isFreeMailDomain).toBe(false);
    // Pragmatic: orgName is a best-effort fallback when no better source exists.
    expect(extract.orgName).toBeDefined();
  });

  test('email #2 — free-mail personal contact', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('freemail-personal')));

    expect(extract.fullName).toBe('Riley Nakamura');
    expect(extract.email).toBe('riley.nakamura@gmail.com');
    expect(extract.orgDomain).toBe('gmail.com');
    expect(extract.isFreeMailDomain).toBe(true);
    // Free-mail domain must not yield an organization name.
    expect(extract.orgName).toBeUndefined();
  });

  test('email #3 — corporate rich multi-office signature', ({ expect }) => {
    const extract = extractContactFromMessage(makeEmailMessage(byId('corporate-rich-signature')));

    expect(extract.fullName).toBe('Saskia Volkov');
    expect(extract.email).toBe('Saskia.Volkov@silverline-partners.example');
    expect(extract.phone).toBe('+1 555 010 4182');
    expect(extract.orgDomain).toBe('silverline-partners.example');
    expect(extract.isFreeMailDomain).toBe(false);

    expect(extract.urls).toBeDefined();
    expect(extract.urls!).toContain('www.silverline-partners.example');

    expect(extract.locations).toBeDefined();
    expect(extract.locations!).toContain('New York');
    expect(extract.locations!).toContain('San Francisco');
    expect(extract.locations!).toContain('London');
  });
});
