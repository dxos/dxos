//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { GMAIL_OAUTH_SCOPES, GOOGLE_CALENDAR_OAUTH_SCOPES, GOOGLE_CONTACTS_OAUTH_SCOPES } from './scopes';

/**
 * Pins the Google OAuth scope sets to the ones declared on the Google Cloud Console consent
 * screen and in the restricted-scope verification submission (DX-794). If this test fails, you
 * changed a runtime scope request: the consent screen and the verification submission must be
 * updated in lockstep, or the app reverts to the unverified state. See `dxos/edge`
 * `docs/casa/WORKPLAN.md` before changing anything here.
 */
describe('Google OAuth scopes (verification pin)', () => {
  test('Gmail connector requests exactly the declared scopes', ({ expect }) => {
    expect([...GMAIL_OAUTH_SCOPES]).toEqual([
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ]);
  });

  test('Gmail connector never requests gmail.readonly or full mail access', ({ expect }) => {
    expect(GMAIL_OAUTH_SCOPES).not.toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(GMAIL_OAUTH_SCOPES).not.toContain('https://mail.google.com/');
  });

  test('Calendar connector requests exactly the declared scopes', ({ expect }) => {
    expect([...GOOGLE_CALENDAR_OAUTH_SCOPES]).toEqual([
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ]);
  });

  test('Contacts connector requests exactly the declared scopes', ({ expect }) => {
    expect([...GOOGLE_CONTACTS_OAUTH_SCOPES]).toEqual([
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ]);
  });
});
