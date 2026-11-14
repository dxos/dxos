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
