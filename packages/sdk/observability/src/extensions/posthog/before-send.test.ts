//
// Copyright 2026 DXOS.org
//

import { type CaptureResult } from 'posthog-js';
import { describe, expect, test } from 'vitest';

import { dropBenignExceptions, redactInvitationCodes } from './before-send.ts';

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

describe('redactInvitationCodes', () => {
  const capture = (properties: CaptureResult['properties'], $set_once?: CaptureResult['$set_once']): CaptureResult => ({
    uuid: '00000000-0000-0000-0000-000000000000',
    event: '$pageview',
    properties,
    ...($set_once && { $set_once }),
  });

  test('removes the code from URLs and leaves the rest of each URL as it was', () => {
    const result = redactInvitationCodes(
      capture(
        {
          $current_url: 'https://drawing.sh/space/diagram?spaceInvitationCode=SECRET',
          $referrer: 'https://drawing.sh/?a=1&spaceInvitationCode=SECRET&b=2#top',
          $pathname: '/space/diagram',
          count: 3,
        },
        { $initial_current_url: 'https://drawing.sh/?a=1&spaceInvitationCode=SECRET' },
      ),
    );
    expect(result?.properties).toEqual({
      $current_url: 'https://drawing.sh/space/diagram',
      $referrer: 'https://drawing.sh/?a=1&b=2#top',
      $pathname: '/space/diagram',
      count: 3,
    });
    expect(result?.$set_once).toEqual({ $initial_current_url: 'https://drawing.sh/?a=1' });
  });
});
