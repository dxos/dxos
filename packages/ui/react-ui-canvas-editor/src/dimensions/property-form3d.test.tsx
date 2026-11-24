//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type LayoutIntent, type Scene } from '@dxos/scene';

import { config3d } from './config3d.tsx';

const cube: Scene.Element3D = { id: 'box', kind: 'cube', overrides: { color: 'blue/1', fill: 'glass' } };

const mount = (element: Scene.Element3D) => {
  const onIntents = vi.fn<(intents: LayoutIntent[]) => void>();
  const Form = config3d.propertyForm;
  render(<Form element={element} readonly={false} onIntents={onIntents} />);
  return onIntents;
};

const isOn = (path: string) => screen.getByTestId(path).getAttribute('data-state') === 'checked';
const press = async (path: string) =>
  act(async () => (await screen.findByTestId(path)).querySelector<HTMLInputElement>('input')?.click());

describe('the 3D property form', () => {
  afterEach(() => cleanup());

  test("a body's look is its Style group: the colour grid, its surface, and a switch each for edges and corners", async () => {
    mount(cube);
    const style = await screen.findByTestId('group.overrides');
    const headings = [...style.querySelectorAll('label, [data-part="legend"]')].map((element) => element.textContent);
    expect(headings).toEqual([
      'Style',
      'Surface',
      'Border',
      'Rounded',
      'Opacity',
      'Metalness',
      'Roughness',
      'Emissive',
    ]);
    const selected = [...screen.getByTestId('style-grid').querySelectorAll('[aria-checked="true"]')];
    expect(selected.map((item) => item.getAttribute('data-style-option'))).toEqual(['blue:1']);
  });

  test('a body draws no edges or rounding unset, so each switch is off until its word says otherwise', async () => {
    const onIntents = mount(cube);
    await screen.findByTestId('overrides.stroke');
    expect(isOn('overrides.stroke')).toBe(false);
    expect(isOn('overrides.corners')).toBe(false);
    await press('overrides.stroke');
    await waitFor(() =>
      expect(onIntents).toHaveBeenLastCalledWith([
        { kind: 'update', id: 'box', path: ['overrides'], value: { color: 'blue/1', fill: 'glass', stroke: 'solid' } },
      ]),
    );
    await press('overrides.corners');
    await waitFor(() =>
      expect(onIntents).toHaveBeenLastCalledWith([
        {
          kind: 'update',
          id: 'box',
          path: ['overrides'],
          value: { color: 'blue/1', fill: 'glass', stroke: 'solid', corners: 'all' },
        },
      ]),
    );
  });

  test('a switch that is on turns its word to none', async () => {
    const onIntents = mount({ ...cube, overrides: { stroke: 'dashed', corners: 'top' } });
    await screen.findByTestId('overrides.stroke');
    expect(isOn('overrides.stroke')).toBe(true);
    expect(isOn('overrides.corners')).toBe(true);
    await press('overrides.stroke');
    await waitFor(() =>
      expect(onIntents).toHaveBeenLastCalledWith([
        { kind: 'update', id: 'box', path: ['overrides'], value: { stroke: 'none', corners: 'top' } },
      ]),
    );
  });
});
