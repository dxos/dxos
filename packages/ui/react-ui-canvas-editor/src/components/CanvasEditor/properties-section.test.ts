//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { propertiesShown } from './properties-section.ts';

describe('propertiesShown', () => {
  test('a selection shows its form, docked or floating', () => {
    expect(propertiesShown({ docked: true, selected: true })).toBe('form');
    expect(propertiesShown({ docked: false, selected: true })).toBe('form');
  });

  test('with nothing selected, a docked panel keeps the section and says so; a floating one drops it', () => {
    expect(propertiesShown({ docked: true, selected: false })).toBe('empty');
    expect(propertiesShown({ docked: false, selected: false })).toBe('hidden');
  });
});
