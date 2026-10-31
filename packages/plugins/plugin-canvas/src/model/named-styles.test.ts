//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Scene } from '@dxos/scene';

import { makeCanvas } from './canvas-document.ts';
import { deleteNamedStyle, namedStyleUses } from './named-styles.ts';

/** A 2D canvas whose model names `accent`, taken by a box and a link, and `quiet`, taken by nothing. */
const styledCanvas = () => {
  const { canvas, model, layout } = makeCanvas();
  if (!Obj.instanceOf(Scene.Model2D, model) || !Obj.instanceOf(Scene.Layout2D, layout)) {
    throw new Error('A 2D canvas has a 2D model and layout.');
  }
  Obj.update(model, (model) => {
    model.styles = {
      accent: { name: 'Accent', hue: 'red', fill: true, lineStyle: 'dashed' },
      quiet: { name: 'Quiet', hue: 'neutral' },
    };
  });
  Obj.update(layout, (layout) => {
    layout.elements = {
      a: { id: 'a', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 }, style: 'accent' },
      b: {
        id: 'b',
        type: 'rect',
        z: 'a1',
        center: { x: 128, y: 0 },
        size: { width: 64, height: 64 },
        style: 'accent',
        overrides: { hue: 'blue' },
      },
      ab: { id: 'ab', type: 'line', z: 'a2', source: { node: 'a' }, target: { node: 'b' }, style: 'accent' },
    };
  });
  return { canvas, model, layout };
};

describe('named styles over Layout2D', () => {
  test('uses count the elements of the canvas layouts that take each style', () => {
    const { canvas } = styledCanvas();
    expect(namedStyleUses(canvas)).toEqual({ accent: 3 });
  });

  test('deleting a style keeps its look on the elements that took it, under their own overrides', () => {
    const { canvas, model, layout } = styledCanvas();
    deleteNamedStyle(canvas, 'accent');
    expect(Object.keys(model.styles ?? {})).toEqual(['quiet']);
    expect(layout.elements.a.style).toBeUndefined();
    expect(layout.elements.a.overrides).toEqual({ hue: 'red', fill: true, lineStyle: 'dashed' });
    expect(layout.elements.b.overrides).toEqual({ hue: 'blue', fill: true, lineStyle: 'dashed' });
    // A link keeps the common base of the style, all it ever drew.
    expect(layout.elements.ab.style).toBeUndefined();
    expect(layout.elements.ab.overrides).toEqual({ hue: 'red', lineStyle: 'dashed' });
    expect(namedStyleUses(canvas)).toEqual({});
  });
});
