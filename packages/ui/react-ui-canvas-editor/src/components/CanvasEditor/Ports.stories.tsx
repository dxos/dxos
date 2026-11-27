//
// Copyright 2026 DXOS.org
//

//
// Where a shape's ports stand along a side. The side is shared among one more gap than it has ports, and the gap is
// rounded down to a whole unit of the minor grid, so the ports stand a whole number of units apart about the side's
// centre and leave the rest of the side at its two ends. An even count gives up one more unit where that puts its
// ports on the grid's lines. Each shape here hangs a link from every port of its bottom side, so the spacing shows
// without hovering.
//
// 1. Hover a shape: its ports show on all four sides, the bottom ones where the links leave.
// 2. Resize a shape: its ports keep to whole units, and step apart only when the side has room for another unit.
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
import { DEFAULT_GRID, type Link, type RectNode, type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

/** A shape, how many ports each of its sides has, and how far apart they stand. */
type Case = {
  id: string;
  width: number;
  ports: number;
  /** Scene px between neighbouring ports. */
  pitch: number;
};

const HEIGHT = 96;

/** How far below its shape a port's link ends. */
const DROP = 48;

const ROWS: readonly (readonly Case[])[] = [
  // 300 / 7 is 42.86, and 300 / 6 is 50: three and four units of 12.
  [
    { id: 'six', width: 300, ports: 6, pitch: 36 },
    { id: 'five', width: 300, ports: 5, pitch: 48 },
  ],
  // 288 / 7 is 41.14, three units, which would stand six ports between the lines of a side 24 units long: two do not.
  [
    { id: 'lined', width: 288, ports: 6, pitch: 24 },
    { id: 'odd', width: 288, ports: 5, pitch: 48 },
  ],
  // 240 / 5 is 48 already; 240 / 4 is 60, a whole five units, and 240 / 3 is 80, which rounds down to 72.
  [
    { id: 'four', width: 240, ports: 4, pitch: 48 },
    { id: 'three', width: 240, ports: 3, pitch: 60 },
    { id: 'two', width: 240, ports: 2, pitch: 72 },
  ],
  // A side too short for a unit a gap shares itself evenly: 60 / 7.
  [
    { id: 'narrow', width: 96, ports: 3, pitch: 24 },
    { id: 'one', width: 96, ports: 1, pitch: 0 },
    { id: 'short', width: 60, ports: 6, pitch: 60 / 7 },
  ],
];

const CASES: readonly Case[] = ROWS.flat();

const GAP = 96;

const board = (): RenderList2D => {
  const nodes: RectNode[] = [];
  const links: Link[] = [];
  ROWS.forEach((row, rowIndex) => {
    const total = row.reduce((sum, { width }) => sum + width, 0) + GAP * (row.length - 1);
    let left = -total / 2;
    for (const { id, width, ports } of row) {
      const node: RectNode = {
        kind: 'rect',
        id,
        z: `a${nodes.length}`,
        center: { x: left + width / 2, y: (rowIndex - (ROWS.length - 1) / 2) * (HEIGHT + DROP + GAP) },
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
 * 1. Every port's link is drawn.
 * 2. On each shape the links leave the bottom side its case's pitch apart: a whole number of grid units, or an even
 *    share of a side too short for one.
 * 3. They stand symmetrically about the side's centre.
 * 4. Six ports on a side 24 units long stand on the grid's lines, counted from the side's start.
 */
export const Test: StoryObj = {
  play: async ({ canvasElement }) => {
    const view = await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 });
    /** Where a link leaves its port along the side, in scene px. */
    const leaves = (id: string): number | undefined => {
      const start = /^M\s*(-?[\d.]+)/.exec(view.querySelector(`path[data-link-id="${id}"]`)?.getAttribute('d') ?? '');
      return start ? Number(start[1]) : undefined;
    };

    // 1. The last link drawn is the last one of the last shape.
    const last = CASES[CASES.length - 1];
    await waitFor(() => expect(leaves(`${last.id}-${last.ports}`)).toBeDefined());

    for (const { id, width, ports, pitch } of CASES) {
      const points = Array.from({ length: ports }, (_, index) => leaves(`${id}-${index + 1}`) ?? Number.NaN);

      // 2. Neighbours stand the pitch apart.
      for (let index = 1; index < points.length; index++) {
        await expect(points[index] - points[index - 1], `${id} gap ${index}`).toBeCloseTo(pitch, 6);
      }

      // 3. The first and last are as far from the centre as each other.
      await expect(points[0] + points[points.length - 1], `${id} centre`).toBeCloseTo(2 * CENTRES[id], 6);

      // 4. The shape whose gap was shortened for it.
      if (id === 'lined') {
        const start = CENTRES[id] - width / 2;
        for (const point of points) {
          const units = (point - start) / DEFAULT_GRID;
          await expect(units, `${id} on a line`).toBeCloseTo(Math.round(units), 6);
        }
      }
    }
  },
};
