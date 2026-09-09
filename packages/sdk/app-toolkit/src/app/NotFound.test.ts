//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as NotFound from './NotFound';

describe('combineVerdicts', () => {
  test('one store saying yes settles it', ({ expect }) => {
    expect(NotFound.combineVerdicts(['absent', 'exists'])).toBe('exists');
    expect(NotFound.combineVerdicts(['unknown', 'exists'])).toBe('exists');
  });

  test('absent requires unanimity', ({ expect }) => {
    expect(NotFound.combineVerdicts(['absent'])).toBe('absent');
    expect(NotFound.combineVerdicts(['absent', 'absent'])).toBe('absent');
  });

  test('a single unknown blocks absent', ({ expect }) => {
    expect(NotFound.combineVerdicts(['absent', 'unknown'])).toBe('unknown');
  });

  test('nothing to ask is unknown, not absent', ({ expect }) => {
    expect(NotFound.combineVerdicts([])).toBe('unknown');
  });
});
