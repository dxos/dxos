//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { duffelErrorMessage } from './DuffelClient';

// A real Duffel 422 body for a past departure date (the failure that motivated surfacing the message).
const PAST_DATE_BODY = JSON.stringify({
  errors: [
    {
      title: 'Invalid date',
      message: "Field 'departure_date' must be after 2026-05-30",
      code: 'invalid_date',
    },
  ],
  meta: { status: 422 },
});

describe('duffelErrorMessage', () => {
  test('extracts the provider message from a Duffel error body', ({ expect }) => {
    expect(duffelErrorMessage(422, PAST_DATE_BODY)).toBe("Field 'departure_date' must be after 2026-05-30");
  });

  test('joins multiple error messages', ({ expect }) => {
    const body = JSON.stringify({ errors: [{ message: 'first' }, { message: 'second' }] });
    expect(duffelErrorMessage(422, body)).toBe('first; second');
  });

  test('falls back to the title when no message is present', ({ expect }) => {
    const body = JSON.stringify({ errors: [{ title: 'Invalid date' }] });
    expect(duffelErrorMessage(422, body)).toBe('Invalid date');
  });

  test('falls back to a status message for a non-JSON body', ({ expect }) => {
    expect(duffelErrorMessage(500, '<html>gateway error</html>')).toBe('Duffel request failed (500).');
  });

  test('falls back to a status message for an empty errors array', ({ expect }) => {
    expect(duffelErrorMessage(422, JSON.stringify({ errors: [] }))).toBe('Duffel request failed (422).');
  });
});
