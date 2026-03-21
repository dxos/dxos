//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import DailySummaryBlueprint, { BLUEPRINT_KEY } from './daily-summary-blueprint';

describe('DailySummaryBlueprint', () => {
  test('has correct key', () => {
    expect(DailySummaryBlueprint.key).toBe('org.dxos.blueprint.daily-summary');
    expect(DailySummaryBlueprint.key).toBe(BLUEPRINT_KEY);
  });

  test('has operation handlers', () => {
    expect(DailySummaryBlueprint.operations).toBeDefined();
  });

  test('make() creates a valid blueprint', () => {
    const blueprint = DailySummaryBlueprint.make();
    expect(blueprint).toBeDefined();
    expect(blueprint.key).toBe(BLUEPRINT_KEY);
    expect(blueprint.name).toBe('Daily Summary');
    expect(blueprint.tools).toBeDefined();
    expect(blueprint.instructions).toBeDefined();
  });
});
