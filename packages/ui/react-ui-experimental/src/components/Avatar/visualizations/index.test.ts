//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { randomize, validate } from '../params.ts';
import { VISUALIZATIONS, getVisualization } from './index.ts';

describe('visualizations', () => {
  test('ids are unique and resolvable', () => {
    const ids = VISUALIZATIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(getVisualization(id)?.id).toBe(id));
  });

  test('every default and preset is within its params', ({ expect }) => {
    for (const visualization of VISUALIZATIONS) {
      expect(Object.keys(visualization.params).sort()).toEqual(Object.keys(visualization.defaults).sort());
      expect(validate(visualization.params, visualization.defaults)).toEqual([]);
      for (const [name, preset] of Object.entries(visualization.presets)) {
        expect(validate(visualization.params, preset), `${visualization.id}/${name}`).toEqual([]);
      }
    }
  });

  test('randomize stays within range and leaves colours alone', ({ expect }) => {
    for (const visualization of VISUALIZATIONS) {
      const random = randomize(visualization.params);
      expect(validate(visualization.params, random)).toEqual([]);
      for (const [key, param] of Object.entries(visualization.params)) {
        expect(key in random).toBe(param.type === 'number');
      }
    }
  });
});
