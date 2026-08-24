//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseFromHeader } from './headers';

describe('parseFromHeader', () => {
  test('name-addr', () => {
    expect(parseFromHeader('Chris <chris@caretoyouhealth.com>')).toEqual({
      name: 'Chris',
      email: 'chris@caretoyouhealth.com',
    });
  });

  test('name-addr with no space before the bracket', () => {
    expect(parseFromHeader('Chris<chris@caretoyouhealth.com>')).toEqual({
      name: 'Chris',
      email: 'chris@caretoyouhealth.com',
    });
  });

  test('quoted display name, which is how a name containing a comma is encoded', () => {
    expect(parseFromHeader('"Burdon, Rich" <rich@braneframe.com>')).toEqual({
      name: 'Burdon, Rich',
      email: 'rich@braneframe.com',
    });
  });

  test('angle-addr with no display name', () => {
    expect(parseFromHeader('<chris@caretoyouhealth.com>')).toEqual({ email: 'chris@caretoyouhealth.com' });
  });

  // The form that landed a synced message with no sender at all: a SendGrid relay emitted the bare
  // address, and a parser that required the brackets returned `undefined` for it.
  test('bare addr-spec', () => {
    expect(parseFromHeader('chris@caretoyouhealth.com')).toEqual({ email: 'chris@caretoyouhealth.com' });
  });

  test('trailing comment', () => {
    expect(parseFromHeader('Chris <chris@caretoyouhealth.com> (via SendGrid)')).toEqual({
      name: 'Chris',
      email: 'chris@caretoyouhealth.com',
    });
    expect(parseFromHeader('chris@caretoyouhealth.com (Chris)')).toEqual({ email: 'chris@caretoyouhealth.com' });
  });

  test('surrounding whitespace', () => {
    expect(parseFromHeader('  Chris <chris@caretoyouhealth.com>  ')).toEqual({
      name: 'Chris',
      email: 'chris@caretoyouhealth.com',
    });
    expect(parseFromHeader('  chris@caretoyouhealth.com  ')).toEqual({ email: 'chris@caretoyouhealth.com' });
  });

  test('an empty display name is omitted rather than reported as a blank name', () => {
    expect(parseFromHeader('"" <chris@caretoyouhealth.com>')).toEqual({ email: 'chris@caretoyouhealth.com' });
  });

  test('a plus-addressed and a subdomain address survive intact', () => {
    expect(parseFromHeader('rich+news@mail.braneframe.com')).toEqual({ email: 'rich+news@mail.braneframe.com' });
  });

  test('whitespace inside the brackets is padding, not part of the address', () => {
    expect(parseFromHeader('Chris < chris@caretoyouhealth.com >')).toEqual({
      name: 'Chris',
      email: 'chris@caretoyouhealth.com',
    });
  });

  test('undefined where there is no address to find', () => {
    expect(parseFromHeader('')).toBeUndefined();
    expect(parseFromHeader('Chris')).toBeUndefined();
    expect(parseFromHeader('undisclosed-recipients:;')).toBeUndefined();
    expect(parseFromHeader('Chris <not-an-address>')).toBeUndefined();
  });

  test('undefined for a bracketed value that is not a single address', () => {
    expect(parseFromHeader('Chris <not an@example.com>')).toBeUndefined();
    expect(parseFromHeader('Chris <a@b@c.com>')).toBeUndefined();
    expect(parseFromHeader('not an@example.com')).toBeUndefined();
  });
});
