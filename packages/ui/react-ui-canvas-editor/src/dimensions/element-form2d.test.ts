//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { elementForm2DIntents, elementForm2DValues } from './element-form2d.ts';

const element: Scene.Element2D = { id: 'b', type: 'rect', center: { x: 256, y: 0 }, size: { width: 128, height: 128 } };

describe('element-form2d', () => {
  test('an unset rotation shows as 0, not as an empty field', () => {
    expect(elementForm2DValues(element).rotation).toBe(0);
  });

  test('a save that changes only the label writes only the label, not the rotation it shows', () => {
    const values = { ...elementForm2DValues(element), label: 'Bee' };
    expect(elementForm2DIntents(element, values)).toEqual([{ kind: 'update', id: 'b', path: ['label'], value: 'Bee' }]);
  });
});
