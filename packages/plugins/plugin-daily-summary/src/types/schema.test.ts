//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';
import * as Schema from 'effect/Schema';

import { DailySummarySettingsSchema } from './schema';

describe('DailySummarySettingsSchema', () => {
  test('validates correct settings', () => {
    const result = Schema.decodeUnknownSync(DailySummarySettingsSchema)({
      summaryHour: 21,
      summaryMinute: 30,
    });
    expect(result.summaryHour).toBe(21);
    expect(result.summaryMinute).toBe(30);
  });

  test('allows empty settings', () => {
    const result = Schema.decodeUnknownSync(DailySummarySettingsSchema)({});
    expect(result.summaryHour).toBeUndefined();
    expect(result.summaryMinute).toBeUndefined();
  });

  test('allows partial settings', () => {
    const result = Schema.decodeUnknownSync(DailySummarySettingsSchema)({
      summaryHour: 14,
    });
    expect(result.summaryHour).toBe(14);
    expect(result.summaryMinute).toBeUndefined();
  });
});
