//
// Copyright 2026 DXOS.org
//

//
// Where a shape's ports stand along a side. They stand a whole number of half major cells apart about the side's
// middle, each on a half line of the major grid and none nearer a corner than half a cell. Of the gaps that do that,
// the side takes the one nearest its even share (its length over its count), and of two as near the one that stands
// more ports on whole lines. Each shape here stands on the major grid, as a shape drawn or moved on the canvas does,
// and hangs a link from every port of its bottom side, so the spacing shows without hovering.
//
// 1. Hover a shape: its ports show on all four sides, the bottom ones where the links leave.
// 2. Resize a shape: its ports stay on the grid's lines, and step apart as the side makes room.
// 3. Change Ports in Properties: the links of ports the side no longer has re-attach to the nearest one.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import {
  type RenderList2D,
  createLink,
  defaultNodeRegistry,
  fromRenderLists2D,
  nodeBounds,
  nodePorts,
  portId,
  portPoint,
} from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Link, MAJOR_GRID, type RectNode, type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

/** A shape, how many ports each of its sides has, and how far apart they stand. */
type Case = {
  id: string;
  width: number;
  ports: number;
  /** Scene px between neighbouring ports. */
  pitch: number;
  /** A side with no room on the grid, whose ports share it evenly. */
  even?: boolean;
};

/** Every size and place here is a whole number of major cells, which is where the canvas lands a shape. */
const HEIGHT = 2 * MAJOR_GRID;

/** How far below its shape a port's link ends. */
const DROP = MAJOR_GRID;

const ROWS: readonly (readonly Case[])[] = [
  // Seven cells, whose middle is a half line: six ports a cell apart stand on whole lines, and five a cell and a
  // half apart stand two on whole lines and the rest on half ones.
  [
    { id: 'six', width: 336, ports: 6, pitch: 48 },
    { id: 'five', width: 336, ports: 5, pitch: 72 },
  ],
  // Six cells, whose middle is a whole line: six ports a cell apart stand on half lines, five on whole ones.
  [
    { id: 'half', width: 288, ports: 6, pitch: 48 },
    { id: 'whole', width: 288, ports: 5, pitch: 48 },
  ],
  // Five cells: four a cell apart; three a cell and a half apart, the outer two on whole lines; two three cells
  // apart, which is as near the even share as two cells and stands both on whole lines.
  [
    { id: 'four', width: 240, ports: 4, pitch: 48 },
    { id: 'three', width: 240, ports: 3, pitch: 72 },
    { id: 'two', width: 240, ports: 2, pitch: 144 },
  ],
  // Two cells take three half a cell apart; six on one cell fit no grid and share it evenly, 48 / 7.
  [
    { id: 'narrow', width: 96, ports: 3, pitch: 24 },
    { id: 'one', width: 96, ports: 1, pitch: 0 },
    { id: 'short', width: 48, ports: 6, pitch: 48 / 7, even: true },
  ],
];

const CASES: readonly Case[] = ROWS.flat();

const GAP = 2 * MAJOR_GRID;

/** From the top of one row to the top of the next. */
const ROW = HEIGHT + DROP + GAP;

const board = (): RenderList2D => {
  const nodes: RectNode[] = [];
  const links: Link[] = [];
  ROWS.forEach((row, rowIndex) => {
    const total = row.reduce((sum, { width }) => sum + width, 0) + GAP * (row.length - 1);
    // About the origin, to the nearest major line.
    let left = -Math.ceil(total / 2 / MAJOR_GRID) * MAJOR_GRID;
    for (const { id, width, ports } of row) {
      const node: RectNode = {
        kind: 'rect',
        id,
        z: `a${nodes.length}`,
        center: { x: left + width / 2, y: (rowIndex - ROWS.length / 2) * ROW + HEIGHT / 2 },
        size: { width, height: HEIGHT },
        label: `${ports} on ${width}`,
        portsPerSide: ports,
        overrides: { color: 'indigo' },
      };
      nodes.push(node);
      left += width + GAP;
      const bounds = nodeBounds(node);
      const placed = nodePorts(defaultNodeRegistry, node);
      for (let index = 1; index <= ports; index++) {
        const port = placed.find((candidate) => candidate.id === portId('bottom', index));
        if (!port) {
          continue;
        }
        const from = portPoint(bounds, port);
        links.push(
          createLink({
            path: 'line',
            id: `${id}-${index}`,
            z: `b${links.length}`,
            source: { node: id, port: port.id },
            target: { point: { x: from.x, y: from.y + DROP } },
          }),
        );
      }
    }
  });
  return {
    id: 'board',
    name: 'Ports',
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: Object.fromEntries(links.map((link) => [link.id, link])),
  };
};

const BOARD = board();

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD], { root: 'board' });

/** Each shape's centre along its bottom side, in scene px. */
const CENTRES: Record<string, number> = Object.fromEntries(
  Object.values(BOARD.nodes).map((node) => [node.id, node.center.x]),
);

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'ui/react-ui-canvas-editor/components/Ports',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

export const Default: StoryObj = {};

/**
 * 1. Every shape stands on the major grid, and every port's link is drawn.
 * 2. On each shape the links leave the bottom side its case's gap apart.
 * 3. They stand symmetrically about the side's middle.
 * 4. Each leaves on a half line of the major grid, counted from the side's start, but on the side too short for one.
 */
export const Test: StoryObj = {
  play: async ({ canvasElement }) => {
    const view = await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 });
    /** Where a link leaves its port along the side, in scene px. */
    const leaves = (id: string): number | undefined => {
      const start = /^M\s*(-?[\d.]+)/.exec(view.querySelector(`path[data-link-id="${id}"]`)?.getAttribute('d') ?? '');
      return start ? Number(start[1]) : undefined;
    };

    // 1. Each frame's corner and size are whole major cells; the last link drawn is the last one of the last shape.
    for (const node of Object.values(BOARD.nodes)) {
      const { x, y, width, height } = nodeBounds(node);
      for (const value of [x, y, width, height]) {
        await expect(Math.abs(value % MAJOR_GRID), `${node.id} on the grid`).toBe(0);
      }
    }
    const last = CASES[CASES.length - 1];
    await waitFor(() => expect(leaves(`${last.id}-${last.ports}`)).toBeDefined());

    for (const { id, width, ports, pitch, even } of CASES) {
      const points = Array.from({ length: ports }, (_, index) => leaves(`${id}-${index + 1}`) ?? Number.NaN);

      // 2. Neighbours stand the pitch apart.
      for (let index = 1; index < points.length; index++) {
        await expect(points[index] - points[index - 1], `${id} gap ${index}`).toBeCloseTo(pitch, 6);
      }

      // 3. The first and last are as far from the centre as each other.
      await expect(points[0] + points[points.length - 1], `${id} centre`).toBeCloseTo(2 * CENTRES[id], 6);

      // 4. Half a major cell is the coarsest line a port may stand on.
      if (!even) {
        const start = CENTRES[id] - width / 2;
        for (const point of points) {
          const steps = (point - start) / (MAJOR_GRID / 2);
          await expect(steps, `${id} on a line`).toBeCloseTo(Math.round(steps), 6);
        }
      }
    }
  },
};
