//
// Copyright 2026 DXOS.org
//

//
// How a link is routed between two ports. Each case is a pair of shapes joined from a named side of the first to a
// named side of the second, so the ports are fixed and only the route is the engine's to choose. An orthogonal link
// leaves each port along its side's normal and then turns at right angles as seldom as it can without crossing
// either shape: no bend where the ports face each other on one line, one where their sides meet at a corner, two for
// a step or a U, three or four where a port faces away from the other shape.
//
// 1. Drag a shape of any pair: its link re-routes, and never runs through either shape.
// 2. Select a link and change Variant in Properties: the same ports, drawn another way.
// 3. Drag a link's end to another port: the route follows the side it now leaves by.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test';

import { type RenderList2D, createLink, fromRenderLists2D, portId } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Link, LINK_TYPES, type LinkType, type Point, type RectNode, type Scene, type Side } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

/** A pair of shapes and the sides their link joins. */
type Case = {
  id: string;
  label: string;
  from: Side;
  to: Side;
  /** The second shape's centre from the first's. */
  offset: Point;
  /** The corners an orthogonal link takes. */
  bends: number;
};

const SIZE = { width: 96, height: 72 };

const CASES: readonly Case[] = [
  // Ports that face each other.
  { id: 'straight', label: 'Straight', from: 'e', to: 'w', offset: { x: 192, y: 0 }, bends: 0 },
  { id: 'step', label: 'Step', from: 'e', to: 'w', offset: { x: 192, y: 96 }, bends: 2 },
  { id: 'close', label: 'Close', from: 'e', to: 'w', offset: { x: 120, y: 48 }, bends: 2 },
  { id: 'down', label: 'Step down', from: 's', to: 'n', offset: { x: 96, y: 168 }, bends: 2 },
  // Sides that meet at a corner, and one whose corner is on the far side.
  { id: 'corner', label: 'Corner', from: 'e', to: 'n', offset: { x: 192, y: 144 }, bends: 1 },
  { id: 'corner-up', label: 'Corner up', from: 'e', to: 's', offset: { x: 192, y: -144 }, bends: 1 },
  { id: 'over', label: 'Over', from: 'e', to: 'n', offset: { x: 192, y: -120 }, bends: 3 },
  // Two ports on the same side.
  { id: 'far-side', label: 'Far side', from: 'e', to: 'e', offset: { x: 192, y: -168 }, bends: 2 },
  { id: 'row', label: 'Row', from: 'n', to: 'n', offset: { x: 192, y: 0 }, bends: 2 },
  { id: 'stack', label: 'Stack', from: 'e', to: 'e', offset: { x: 0, y: 168 }, bends: 2 },
  // Ports that face away from each other.
  { id: 'away', label: 'Away', from: 'w', to: 'e', offset: { x: 192, y: 144 }, bends: 4 },
  { id: 'around', label: 'Around', from: 'w', to: 'e', offset: { x: 192, y: 0 }, bends: 4 },
];

const COLUMNS = 4;
const CELL = { width: 408, height: 336 };

/** The centre port of a side, of the three a shape spreads along each. */
const centre = (side: Side): string => portId(side, 2);

const boardOf = (type: LinkType): RenderList2D => {
  const rows = Math.ceil(CASES.length / COLUMNS);
  const nodes: RectNode[] = [];
  const links: Link[] = [];
  CASES.forEach(({ id, label, from, to, offset }, index) => {
    // The pair stands in the middle of its cell, and the cells about the origin.
    const middle = {
      x: ((index % COLUMNS) - (COLUMNS - 1) / 2) * CELL.width,
      y: (Math.floor(index / COLUMNS) - (rows - 1) / 2) * CELL.height,
    };
    const first = { x: middle.x - offset.x / 2, y: middle.y - offset.y / 2 };
    const second = { x: first.x + offset.x, y: first.y + offset.y };
    nodes.push(
      { type: 'rect', id: `${id}-a`, z: `a${index}0`, center: first, size: SIZE, label, style: { hue: 'indigo' } },
      {
        type: 'rect',
        id: `${id}-b`,
        z: `a${index}1`,
        center: second,
        size: SIZE,
        label: `${from} → ${to}`,
        style: { hue: 'teal' },
      },
    );
    links.push(
      createLink({
        type,
        id,
        z: `b${index}`,
        source: { node: `${id}-a`, port: centre(from) },
        target: { node: `${id}-b`, port: centre(to) },
      }),
    );
  });
  return {
    id: 'board',
    name: 'Links',
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: Object.fromEntries(links.map((link) => [link.id, link])),
  };
};

const documentOf = (type: LinkType): Scene.SceneDocument => fromRenderLists2D([boardOf(type)], { root: 'board' });

type StoryArgs = {
  /** The variant every link is drawn as. */
  type: LinkType;
  /** The link selected as the editor opens, so its ends show. */
  select?: string;
};

const DefaultStory = ({ type, select }: StoryArgs) => {
  const document = useMemo(() => documentOf(type), [type]);
  return (
    // Keyed, so a control change opens the new drawing rather than editing the old one.
    <SceneEditorStory key={type} document={document} docked select={select ? [select] : undefined}>
      <FullEditor dim='2d' />
    </SceneEditorStory>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/components/Links',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    type: { control: 'inline-radio', options: LINK_TYPES },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Each port left along its side's normal, then right angles, as few as the two shapes allow. */
export const Orthogonal: Story = {
  args: { type: 'ortho' },
};

/** The same ports as an elbow: a stub out of each, joined by one segment. */
export const Elbow: Story = {
  args: { type: 'smart' },
};

/** The same ports as a curve, which leaves each along its side's normal and bends toward the other. */
export const Curve: Story = {
  args: { type: 'curve' },
};

/**
 * 1. Every case's link is drawn.
 * 2. Each takes the corners its case names: none for Straight, one for Corner, two for a step or a U, three for
 *    Over, four where the ports face away.
 */
export const Test: Story = {
  args: { type: 'ortho' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const pathOf = (id: string) => view.querySelector(`path[data-link-id="${id}"]`)?.getAttribute('d');
    await waitFor(() => expect(pathOf(CASES[0].id)).toBeTruthy());
    for (const { id, bends } of CASES) {
      // A route's corners are rounded, each one curve between two straight runs.
      await expect((pathOf(id) ?? '').split('Q').length - 1, id).toBe(bends);
    }
  },
};

/**
 * A press on a link's end that opens its menu, or that goes nowhere, leaves the end on its port.
 *
 * 1. Control-click the end of the Far side link on its second shape: the link's menu opens and the link keeps its
 *    two corners (an end off its port would draw one).
 * 2. Click that end without moving: the link is unchanged.
 * 3. Right-click that end: the menu opens, and the link is still selected and unchanged.
 */
export const EndMenuTest: Story = {
  args: { type: 'ortho', select: 'far-side' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const corners = () =>
      (view.querySelector('path[data-link-id="far-side"]')?.getAttribute('d') ?? '').split('Q').length - 1;
    const end = () => view.querySelector('[data-link-end="target"]');
    await waitFor(() => expect(end()).not.toBeNull());
    await expect(corners()).toBe(2);
    const handle = end();
    if (!handle) {
      return;
    }
    const { left, top, width, height } = handle.getBoundingClientRect();
    const at = { clientX: left + width / 2, clientY: top + height / 2 };
    const closeMenu = async () => {
      const item = await screen.findByTestId('menu-delete');
      // Keys reach the menu only once it has focus.
      await waitFor(() => expect(item.closest('[role="menu"]')).toHaveFocus());
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByTestId('menu-delete')).toBeNull());
    };

    // 1. A control-click is the primary button with the key held, then the menu's own event.
    await fireEvent.pointerDown(handle, { ...at, button: 0, ctrlKey: true, pointerId: 1 });
    await fireEvent.contextMenu(handle, { ...at, button: 0, ctrlKey: true });
    await fireEvent.pointerUp(view, { ...at, button: 0, ctrlKey: true, pointerId: 1 });
    await closeMenu();
    await expect(corners()).toBe(2);

    // 2. A press released where it began.
    await fireEvent.pointerDown(handle, { ...at, button: 0, pointerId: 1 });
    await fireEvent.pointerUp(view, { ...at, button: 0, pointerId: 1 });
    await expect(corners()).toBe(2);

    // 3. The secondary button.
    await fireEvent.pointerDown(handle, { ...at, button: 2, pointerId: 1 });
    await fireEvent.contextMenu(handle, { ...at, button: 2 });
    await fireEvent.pointerUp(view, { ...at, button: 2, pointerId: 1 });
    await closeMenu();
    await expect(end()).not.toBeNull();
    await expect(corners()).toBe(2);
  },
};

/**
 * A right-click on a link's end offers that end's marker, and the markers last set are what the next link takes.
 *
 * 1. Right-click the end of the Far side link on its second shape: the menu leads with End, and None is checked.
 * 2. Pick Arrow: the link draws an arrow at that end, and the menu closes.
 * 3. Right-click the end again: Arrow is checked.
 * 4. With the Orthogonal tool, drag from the Straight pair's first shape to the Step pair's second: the new link
 *    draws an arrow at its end too.
 */
export const EndMarkerTest: Story = {
  args: { type: 'ortho', select: 'far-side' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const marker = (path: Element | null | undefined) => path?.getAttribute('marker-end') ?? '';
    // A link's markers are on a path of their own, over its line.
    const link = () => view.querySelector('path[data-link-ends="far-side"]');
    const end = () => view.querySelector('[data-link-end="target"]');
    await waitFor(() => expect(end()).not.toBeNull());
    const centreOf = (element: Element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return { clientX: left + width / 2, clientY: top + height / 2 };
    };
    const openMenu = async () => {
      const handle = end();
      if (handle) {
        await fireEvent.contextMenu(handle, { ...centreOf(handle), button: 2 });
      }
      const none = await screen.findByTestId('menu-end-none');
      // Keys reach the menu only once it has focus.
      await waitFor(() => expect(none.closest('[role="menu"]')).toHaveFocus());
      return none;
    };

    // 1. The end's own section leads the menu.
    const none = await openMenu();
    await expect(none).toHaveAttribute('aria-checked', 'true');
    // Each choice shows the line with that end on it.
    const glyph = (value: string) => screen.getByTestId(`menu-end-${value}`).querySelector('use')?.getAttribute('href');
    await waitFor(() => expect(glyph('arrow')).toBe('#px--line-arrow--regular'));
    await waitFor(() => expect(glyph('circle')).toBe('#px--line-circle--regular'));
    await waitFor(() => expect(glyph('triangle')).toBe('#px--line-triangle--regular'));
    await waitFor(() => expect(glyph('many')).toBe('#px--line-many--regular'));
    await expect(marker(link())).toBe('');

    // 2. By keyboard, since the menu ignores the synthetic pointer events a test can send.
    const arrow = screen.getByTestId('menu-end-arrow');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(arrow).toHaveAttribute('data-highlighted'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(marker(link())).toContain('arrow-end'));
    await waitFor(() => expect(screen.queryByTestId('menu-end-none')).toBeNull());

    // 3. The menu shows what the end now draws.
    await openMenu();
    await expect(screen.getByTestId('menu-end-arrow')).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('menu-end-none')).toBeNull());

    // 4. A link drawn next takes the same markers.
    const known = new Set(CASES.map(({ id }) => id));
    const drawn = () =>
      [...view.querySelectorAll('path[data-link-ends]')].filter(
        (path) => !known.has(path.getAttribute('data-link-ends') ?? ''),
      );
    const [from, to] = [
      view.querySelector('[data-node-id="straight-a"]'),
      view.querySelector('[data-node-id="step-b"]'),
    ];
    if (!from || !to) {
      throw new Error('The shapes to link are not drawn.');
    }
    await userEvent.click(await canvas.findByRole('button', { name: /^Orthogonal/ }));
    await fireEvent.pointerDown(from, { ...centreOf(from), button: 0, pointerId: 1 });
    await fireEvent.pointerMove(view, { ...centreOf(to), buttons: 1, pointerId: 1 });
    await fireEvent.pointerUp(view, { ...centreOf(to), button: 0, pointerId: 1 });
    await waitFor(() => expect(drawn()).toHaveLength(1));
    await expect(marker(drawn()[0])).toContain('arrow-end');
  },
};

/**
 * A link's end is wherever the press lands on what is drawn there, whether or not the link was selected first: its
 * marker and the line beside it, and the point it meets a shape at, which that shape's port otherwise covers.
 */
export const EndPressTest: Story = {
  args: { type: 'ortho' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    // The wide twin of the link's line, which is what a press on the link lands on.
    const line = () => view.querySelector<SVGPathElement>('path[data-link-press="far-side"]');
    await waitFor(() => expect(line()).not.toBeNull());
    const path = line();
    if (!path) {
      throw new Error('The link is not drawn.');
    }
    /** Where the link is `back` scene units short of its target end, on screen. */
    const short = (back: number) => {
      const { x, y } = path.getPointAtLength(path.getTotalLength() - back);
      const matrix = path.getScreenCTM();
      const point = matrix ? new DOMPoint(x, y).matrixTransform(matrix) : new DOMPoint(x, y);
      return { clientX: point.x, clientY: point.y };
    };
    const closeMenu = async (item: HTMLElement) => {
      await waitFor(() => expect(item.closest('[role="menu"]')).toHaveFocus());
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    };
    // The view fits its scene after it mounts, and a press aimed while it does lands somewhere else.
    let placed = '';
    await waitFor(() => {
      const matrix = path.getScreenCTM();
      const now = matrix ? [matrix.a, matrix.e, matrix.f].join() : '';
      const still = now !== '' && now === placed;
      placed = now;
      return expect(still).toBe(true);
    });

    // 1. A press on the line beside its end, with nothing selected, leads the menu with that end's marker.
    await fireEvent.contextMenu(path, { ...short(8), button: 2 });
    await closeMenu(await screen.findByTestId('menu-end-none'));
    await waitFor(() => expect(view.querySelector('[data-link-end="target"]')).not.toBeNull());

    // 2. A press on the middle of the link is on the link, not an end.
    await fireEvent.contextMenu(path, { ...short(path.getTotalLength() / 2), button: 2 });
    const cut = await screen.findByRole('menuitem', { name: /^Cut/ });
    await expect(screen.queryByTestId('menu-end-none')).toBeNull();
    await closeMenu(cut);

    // 3. A press on the point the link meets its shape at, where the press lands on the canvas, is on the end too.
    await fireEvent.contextMenu(view, { ...short(0), button: 2 });
    await closeMenu(await screen.findByTestId('menu-end-none'));
  },
};
