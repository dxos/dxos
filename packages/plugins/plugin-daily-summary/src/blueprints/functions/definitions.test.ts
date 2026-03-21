//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GenerateSummary } from './definitions';

describe('GenerateSummary definition', () => {
  test('has correct operation key', () => {
    expect(GenerateSummary.meta.key).toBe('org.dxos.function.daily-summary.generate');
  });

  test('has name and description', () => {
    expect(GenerateSummary.meta.name).toBe('Generate Daily Summary');
    expect(GenerateSummary.meta.description).toContain('markdown');
  });

  test('requires Database.Service', () => {
    expect(GenerateSummary.services).toBeDefined();
    expect(GenerateSummary.services.length).toBe(1);
  });
});
