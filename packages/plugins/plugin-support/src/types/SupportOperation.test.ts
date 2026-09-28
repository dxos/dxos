//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as SupportOperation from './SupportOperation.ts';

// The feedback form validates with this schema, so a report it accepts is one the operation accepts.
const isValid = Schema.is(SupportOperation.SupportRequest);

describe('SupportRequest', () => {
  test('rejects an empty body', ({ expect }) => {
    expect(isValid({ title: 'App keeps reloading', body: '' })).toBe(false);
  });

  test('rejects a whitespace-only body', ({ expect }) => {
    expect(isValid({ title: 'App keeps reloading', body: ' \n\t ' })).toBe(false);
  });

  test('rejects a whitespace-only title', ({ expect }) => {
    expect(isValid({ title: '   ', body: 'Reloads every few seconds.' })).toBe(false);
  });

  test('accepts a report with a title and body', ({ expect }) => {
    expect(isValid({ title: 'App keeps reloading', body: 'Reloads every few seconds.' })).toBe(true);
  });
});
