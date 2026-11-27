//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { useLayoutEffect, useMemo } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import {
  type DrawScene,
  type RenderList2D,
  ViewBuilder,
  createCanvasAtoms,
  createDrawState,
  defaultNodeRegistry,
  getElement,
  useCanvasHistory,
  useDrawScene,
  useRegistry,
} from '@dxos/react-ui-canvas';
import { type Element, type ElementId, type Style2D } from '@dxos/scene';

import { PropertiesInspector } from './PropertiesInspector.tsx';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

const view = (): RenderList2D => {
  const {
    views: [scene],
  } = ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)).properties({ label: 'Rect', overrides: { color: 'teal', stroke: 'dashed' } }),
    ViewBuilder.rect('b', box(400)).properties({ label: 'Literal', overrides: { color: '#1e90ff' } }),
    ViewBuilder.rect('c', box(800)).properties({ label: 'Named', overrides: { color: 'grey/1' } }),
    ViewBuilder.note('n', box(0, 200)).properties({ label: 'Note', overrides: { textColor: 'red/3' } }),
    ViewBuilder.link('smart', 'a', 'b')
      .id('ab')
      .properties({ head: 'arrow', overrides: { color: 'blue/2' } }),
  ]).build();
  return scene;
};

type Probe = { read: (id: ElementId) => Element | undefined };

/** The panel over an in-memory scene and a fixed selection, as its story mounts it; `probe` reads the model back. */
const Harness = ({ select, probe }: { select: ElementId[]; probe: Probe }) => {
  const registry = useRegistry();
  const scene = useMemo(view, []);
  const store = useMemo(() => createDrawState([scene]), [scene]);
  const atoms = useMemo(() => createCanvasAtoms(scene.id), [scene]);
  const history = useCanvasHistory({ registry, atoms, store });
  const draw: DrawScene = useDrawScene({ store, atoms, history, nodeRegistry: defaultNodeRegistry });
  useLayoutEffect(() => {
    registry.set(atoms.selection, new Set(select));
  }, [registry, atoms, select]);
  probe.read = (id) => getElement(registry.get(draw.scene), id);
  return <PropertiesInspector draw={draw} atoms={atoms} styles={store.styles} />;
};

const mount = (select: ElementId[]) => {
  const probe: Probe = { read: () => undefined };
  render(<Harness select={select} probe={probe} />);
  return probe;
};

/** The look an element stores as its own. */
const look = (probe: Probe, id: ElementId): Style2D | undefined => probe.read(id)?.overrides;

/** A switch of the form, by the path it is bound to: whether it is on, and a press of it. */
const isOn = (path: string) => screen.getByTestId(path).getAttribute('data-state') === 'checked';
const press = async (path: string) =>
  act(async () => (await screen.findByTestId(path)).querySelector<HTMLInputElement>('input')?.click());

/** The text of each label and group heading under `root`, in the order they are drawn. */
const headings = (root: HTMLElement) =>
  [...root.querySelectorAll('label, [data-part="legend"]')].map((element) => element.textContent);

const swatch = async (grid: string, attribute: string, key: string) => {
  const element = (await screen.findByTestId(grid)).querySelector<HTMLElement>(`[${attribute}="${key}"]`);
  expect(element).not.toBeNull();
  await act(async () => element?.click());
};

const checked = (grid: string) =>
  [...screen.getByTestId(grid).querySelectorAll('[aria-checked="true"]')].map(
    (item) => item.getAttribute('data-style-option') ?? item.getAttribute('data-text-color-option'),
  );

describe('PropertiesInspector', () => {
  afterEach(() => cleanup());

  test('a node shows its look under Style, with the controls the panel has always had, in their order', async () => {
    mount(['a']);
    const style = await screen.findByTestId('group.overrides');
    expect(headings(style)).toEqual([
      'Style',
      'Opacity',
      'Line style',
      'Rounded',
      'Fill',
      'Border',
      'Guide',
      'Font',
      'Font size',
      'Horizontal',
      'Vertical',
    ]);
    // The class's name and a diagram's weight have no row.
    expect(screen.queryByTestId('overrides.weight')).toBeNull();
    expect(screen.queryByTestId('style')).toBeNull();
  });

  test('a swatch writes the hue and its tone as one colour, and the stored colour selects its swatch', async () => {
    const probe = mount(['a']);
    await waitFor(() => expect(checked('style-grid')).toEqual(['teal:2']));
    await swatch('style-grid', 'data-style-option', 'blue:1');
    await waitFor(() => expect(look(probe, 'a')).toEqual({ color: 'blue/1', stroke: 'dashed' }));
    await waitFor(() => expect(checked('style-grid')).toEqual(['blue:1']));
    await swatch('style-grid', 'data-style-option', 'neutral:0');
    await waitFor(() => expect(look(probe, 'a')).toEqual({ color: 'neutral/0', stroke: 'dashed' }));
  });

  test('a literal colour, or a theme name outside the grid, selects no swatch and is kept until one is picked', async () => {
    const literal = mount(['b']);
    await screen.findByTestId('style-grid');
    expect(checked('style-grid')).toEqual([]);
    expect(look(literal, 'b')).toEqual({ color: '#1e90ff' });
    await swatch('style-grid', 'data-style-option', 'green:3');
    await waitFor(() => expect(look(literal, 'b')).toEqual({ color: 'green/3' }));
    cleanup();

    const named = mount(['c']);
    await screen.findByTestId('style-grid');
    expect(checked('style-grid')).toEqual([]);
    expect(look(named, 'c')).toEqual({ color: 'grey/1' });
  });

  test('Fill is on unless the fill is none: off writes none, on clears the field', async () => {
    const probe = mount(['a']);
    await screen.findByTestId('overrides.fill');
    expect(isOn('overrides.fill')).toBe(true);
    await press('overrides.fill');
    await waitFor(() => expect(look(probe, 'a')).toMatchObject({ fill: 'none' }));
    await waitFor(() => expect(isOn('overrides.fill')).toBe(false));
    await press('overrides.fill');
    await waitFor(() => expect(look(probe, 'a')?.fill).toBeUndefined());
    await waitFor(() => expect(isOn('overrides.fill')).toBe(true));
  });

  test('Border shares the stroke with the line style: off writes none, on restores the dash it had', async () => {
    const probe = mount(['a']);
    const border = () => isOn('overrides.stroke');
    await waitFor(() => expect(border()).toBe(true));
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'a')).toMatchObject({ stroke: 'none' }));
    await waitFor(() => expect(border()).toBe(false));
    // The line style still reads as the dash the border had.
    expect(screen.getByRole('combobox', { name: 'Line style' }).textContent).toContain('Dashed');
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'a')).toMatchObject({ stroke: 'dashed' }));
    await waitFor(() => expect(border()).toBe(true));
  });

  test('a border with no dash of its own is cleared when turned back on, since unset is drawn', async () => {
    const probe = mount(['b']);
    const border = () => isOn('overrides.stroke');
    await waitFor(() => expect(border()).toBe(true));
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'b')).toMatchObject({ stroke: 'none' }));
    await waitFor(() => expect(border()).toBe(false));
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'b')?.stroke).toBeUndefined());
    await waitFor(() => expect(border()).toBe(true));
  });

  test('a kind that draws no fill or border unless asked states one when turned on, and none when turned off', async () => {
    const probe = mount(['n']);
    await screen.findByTestId('overrides.fill');
    // A note draws its text alone, so both are off while its look states neither.
    expect(isOn('overrides.fill')).toBe(false);
    expect(isOn('overrides.stroke')).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Line style' }).textContent).toContain('Default');
    await press('overrides.fill');
    await waitFor(() => expect(look(probe, 'n')).toMatchObject({ fill: 'solid' }));
    await waitFor(() => expect(isOn('overrides.fill')).toBe(true));
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'n')).toMatchObject({ fill: 'solid', stroke: 'solid' }));
    await waitFor(() => expect(isOn('overrides.stroke')).toBe(true));
    await press('overrides.fill');
    await waitFor(() => expect(look(probe, 'n')).toMatchObject({ fill: 'none', stroke: 'solid' }));
    await press('overrides.stroke');
    await waitFor(() => expect(look(probe, 'n')).toMatchObject({ fill: 'none', stroke: 'none' }));
  });

  test('Rounded writes the corners: off none, on all', async () => {
    const probe = mount(['a']);
    const rounded = () => isOn('overrides.corners');
    await waitFor(() => expect(rounded()).toBe(true));
    await press('overrides.corners');
    await waitFor(() => expect(look(probe, 'a')).toMatchObject({ corners: 'none' }));
    await waitFor(() => expect(rounded()).toBe(false));
    await press('overrides.corners');
    await waitFor(() => expect(look(probe, 'a')).toMatchObject({ corners: 'all' }));
  });

  test("a note's text colour is one colour: a swatch writes its hue and tone, and the selected one clears it", async () => {
    const probe = mount(['n']);
    await waitFor(() => expect(checked('text-color-grid')).toEqual(['red:3']));
    await swatch('text-color-grid', 'data-text-color-option', 'blue:1');
    await waitFor(() => expect(look(probe, 'n')).toEqual({ textColor: 'blue/1' }));
    await swatch('text-color-grid', 'data-text-color-option', 'blue:1');
    await waitFor(() => expect(look(probe, 'n')?.textColor).toBeUndefined());
  });

  test('a link shows its type first, its ends as one group and its colour as the outline row alone', async () => {
    const probe = mount(['ab']);
    const panel = await screen.findByTestId('properties');
    await screen.findByTestId('group.ends');
    const labels = headings(panel);
    expect(labels.slice(0, 10)).toEqual([
      'Type',
      'Locked',
      'Ends',
      'Start',
      'End',
      'Label',
      'Layer',
      'Class',
      'Style',
      'Line style',
    ]);
    expect(labels).toContain('Font size');
    expect(screen.getByRole('combobox', { name: 'Type' }).textContent).toContain('Elbow');
    expect(screen.getByRole('combobox', { name: 'End' }).textContent).toContain('Arrow');
    expect(screen.getByRole('combobox', { name: 'Start' }).textContent).toContain('None');
    // A link has no fill, so its hue is picked on the outline row and its tone is left as it is.
    expect(screen.getByTestId('style-grid').querySelectorAll('[data-style-option]')).toHaveLength(9);
    expect(screen.queryByTestId('overrides.fill')).toBeNull();
    await swatch('style-grid', 'data-style-option', 'red:0');
    await waitFor(() => expect(look(probe, 'ab')).toEqual({ color: 'red/2' }));
  });
});
