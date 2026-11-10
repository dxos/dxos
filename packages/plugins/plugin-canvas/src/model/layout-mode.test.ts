//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { DEFAULT_LATTICE } from '@dxos/react-ui-canvas';
import { Scene } from '@dxos/scene';

import { makeCanvas } from './canvas-document.ts';
import { adoptLayoutMode, layoutLattice, setLayoutLattice, withSettingsMode } from './layout-mode.ts';

const canvas2D = (settings: Parameters<typeof makeCanvas>[0] = {}) => {
  const made = makeCanvas(settings);
  if (!Obj.instanceOf(Scene.Layout2D, made.layout)) {
    throw new Error('A 2D canvas has a 2D layout.');
  }
  return { ...made, layout: made.layout };
};

describe('the mode lives on the layout', () => {
  test("a canvas set to lattice moves the lattice onto its 2D layouts and leaves its settings' mode", () => {
    const { canvas, layout } = canvas2D({ lattice: true, readonly: true });
    expect(adoptLayoutMode(canvas)).toBe(true);
    expect(layout.lattice).toEqual(DEFAULT_LATTICE);
    expect(canvas.settings).toEqual({ readonly: true });
    expect(adoptLayoutMode(canvas)).toBe(false);
  });

  test('a canvas set to constrained moves the constraints its layout kept in props onto the layout', () => {
    const { canvas, layout } = canvas2D({ projection: 'constrained' });
    const constraints = [{ subject: 'a', relation: 'east', object: 'b' }] as const;
    Obj.update(layout, (layout) => {
      layout.props = { constrained: { nodes: [{ id: 'a' }, { id: 'b' }], constraints } };
    });
    adoptLayoutMode(canvas);
    expect(layout.constraints).toEqual(constraints);
  });

  test('a canvas set to dynamic arranges its layouts dynamically', () => {
    const { canvas, layout } = canvas2D({ projection: 'dynamic' });
    adoptLayoutMode(canvas);
    expect(layout.arrange).toEqual({ kind: 'dynamic' });
  });

  test('a freehand canvas writes nothing', () => {
    const { canvas, layout } = canvas2D();
    expect(adoptLayoutMode(canvas)).toBe(false);
    expect(layout.lattice).toBeUndefined();
  });

  test('a legacy layout record takes the mode its canvas record named', () => {
    const record: Scene.LayoutRecord2D = { id: 'root', dim: '2d', elements: {} };
    expect(withSettingsMode(record, { lattice: true }).lattice).toEqual(DEFAULT_LATTICE);
    expect(withSettingsMode(record, {})).toBe(record);
  });

  test("the lattice toggle writes every 2D layout of the canvas, and reads the open scene's", () => {
    const { canvas, layout } = canvas2D();
    expect(layoutLattice(canvas)).toBe(false);
    setLayoutLattice(canvas, true);
    expect(layout.lattice).toEqual(DEFAULT_LATTICE);
    expect(layoutLattice(canvas)).toBe(true);
    setLayoutLattice(canvas, false);
    expect(layout.lattice).toBeUndefined();
  });
});
