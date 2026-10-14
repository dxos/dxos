//
// Copyright 2026 DXOS.org
//

import { type CaptureResult } from 'posthog-js';
import { describe, expect, test } from 'vitest';

import { dropBenignExceptions } from './before-send.ts';

const exception = (...values: string[]): CaptureResult => ({
  uuid: '00000000-0000-0000-0000-000000000000',
  event: '$exception',
  properties: { $exception_list: values.map((value) => ({ type: 'Error', value })) },
});

describe('dropBenignExceptions', () => {
  test('drops a ResizeObserver loop error', () => {
    expect(dropBenignExceptions(exception('ResizeObserver loop completed with undelivered notifications.'))).toBeNull();
  });

  test('keeps other exceptions, alone or alongside a benign one', () => {
    const real = exception('Cannot read properties of undefined');
    expect(dropBenignExceptions(real)).toBe(real);
    const mixed = exception('ResizeObserver loop completed with undelivered notifications.', 'Boom');
    expect(dropBenignExceptions(mixed)).toBe(mixed);
  });

  test('keeps non-exception events', () => {
    const pageview: CaptureResult = {
      uuid: '00000000-0000-0000-0000-000000000000',
      event: '$pageview',
      properties: {},
    };
    expect(dropBenignExceptions(pageview)).toBe(pageview);
  });
});
