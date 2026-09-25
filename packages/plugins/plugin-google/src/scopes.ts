//
// Copyright 2026 DXOS.org
//

/**
 * OAuth scopes requested by the Google connectors.
 *
 * These sets are pinned by `scopes.test.ts`: they must match the Google Cloud Console consent
 * screen and the restricted-scope verification submission exactly (DX-794). A runtime
 * authorization request for a scope that is not declared there puts the app back into the
 * unverified state. Do not add or remove a scope without updating the verification submission —
 * see `dxos/edge` `docs/casa/WORKPLAN.md`.
 */

/**
 * Gmail. `gmail.modify` (restricted) covers reading messages and moving them to the trash —
 * `gmail.readonly` is deliberately not requested since `gmail.modify` subsumes it. `gmail.send`
 * (sensitive) sends only. The full `https://mail.google.com/` scope is never requested.
 */
export const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

/**
 * Calendar. `calendar.readonly` is required to list the user's calendars (GetGoogleCalendars);
 * `calendar.events` adds read/write on events so draft events can be created remotely.
 */
export const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

/** Contacts, read-only. */
export const GOOGLE_CONTACTS_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;
