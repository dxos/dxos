//
// Copyright 2026 DXOS.org
//

//
// The canvas's Draw tool (S, after Polyline in the tools panel) in the shared editor. A stroke is drawn in one
// press: the pointer's path is sampled while the button is down, thinned to the points the line needs, and landed as
// a polyline run as a curve through them (`params.smooth`). The board starts with three such lines, so the look is
// there before anything is drawn: an open wave, the wave's points as straight segments, and a loop closed on itself.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { type RenderList2D, fromRenderLists2D } from '@dxos/react-ui-canvas';
import { FullEditor, SceneEditorStory } from '@dxos/react-ui-canvas-editor/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Point, type PolylineNode, type Scene } from '@dxos/scene';

const SIZE = { width: 288, height: 144 };

/** A wave across the frame, in its unit space: a few points, as a stroke keeps once it is thinned. */
const WAVE: Point[] = Array.from({ length: 9 }, (_, index) => ({
  x: index / 8,
  y: 0.5 - 0.5 * Math.sin((index / 8) * 2 * Math.PI),
}));

/** A ring of points round the frame's centre, uneven as a hand draws one. */
const LOOP: Point[] = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * 2 * Math.PI;
  const reach = 0.5 - (index % 3 === 0 ? 0.08 : 0);
  return { x: 0.5 + reach * Math.cos(angle), y: 0.5 + reach * Math.sin(angle) };
});

const line = (
  id: string,
  [x, y]: [number, number],
  label: string,
  points: Point[],
  params: PolylineNode['params'],
): PolylineNode => ({
  type: 'polyline',
  id,
  z: `a-${id}`,
  center: { x, y },
  size: SIZE,
  label,
  points,
  params,
});

const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      line('wave', [-192, -216], 'smooth', WAVE, { smooth: true }),
      line('segments', [-192, -24], 'the same points, straight', WAVE, {}),
      line('loop', [144, -216], 'smooth, closed', LOOP, { smooth: true, closed: true }),
    ].map((node) => [node.id, node]),
  ),
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD], { root: 'board' });

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'plugins/plugin-canvas/components/Draw',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The strokes the tool has drawn, as drawn. */
const strokes = (root: HTMLElement) => [
  ...root.querySelectorAll('[data-testid="scene-view"] [data-node-id^="freehand-"]'),
];

/** The path a line is painted through: its outline is a mask over its frame. */
const pathOf = (node: Element): string => {
  const mask = node.querySelector<HTMLElement>('[style*="mask-image"]')?.style.maskImage ?? '';
  return decodeURIComponent(mask).match(/ d='([^']+)'/)?.[1] ?? '';
};

/**
 * 1. The Draw tool is in the tools panel, straight after Polyline.
 * 2. Press S, then press, drag and release on the canvas: the stroke is drawn as it goes and lands as one line.
 * 3. The line is a curve, with far fewer points than the pointer passed, and none of it is cut off by its frame.
 * 4. The tool is still in hand: a second stroke needs no key.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });

    const tools = [...canvasElement.querySelectorAll('[data-testid^="canvas.tool.node:"]')].map((tool) =>
      tool.getAttribute('data-testid'),
    );
    await expect(tools[tools.indexOf('canvas.tool.node:polyline') + 1]).toBe('canvas.tool.node:freehand');

    const frame = view.getBoundingClientRect();
    const origin = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };
    const at = ([dx, dy]: readonly [number, number]) => ({
      clientX: origin.x + dx,
      clientY: origin.y + dy,
      button: 0,
      pointerId: 1,
    });
    // A box drawn round in one go, a sample every few px: its corners turn on the frame's edges.
    const box = (left: number, top: number): [number, number][] => {
      const side = (from: [number, number], to: [number, number]): [number, number][] =>
        Array.from({ length: 20 }, (_, index) => [
          from[0] + ((to[0] - from[0]) * (index + 1)) / 20,
          from[1] + ((to[1] - from[1]) * (index + 1)) / 20,
        ]);
      const corners: [number, number][] = [
        [left, top + 100],
        [left, top],
        [left + 160, top],
        [left + 160, top + 100],
        [left + 20, top + 100],
      ];
      return [corners[0], ...corners.slice(1).flatMap((corner, index) => side(corners[index], corner))];
    };
    const stroke = async (path: readonly [number, number][]) => {
      await fireEvent.pointerDown(view, at(path[0]));
      for (const point of path.slice(1)) {
        await fireEvent.pointerMove(view, at(point));
      }
      await expect(await canvas.findByTestId('freehand-stroke')).toBeInTheDocument();
      await fireEvent.pointerUp(view, at(path[path.length - 1]));
    };

    view.focus();
    await userEvent.keyboard('s');
    const first = box(-280, 110);
    await stroke(first);
    await waitFor(() => expect(strokes(canvasElement)).toHaveLength(1));

    const [drawn] = strokes(canvasElement);
    const path = pathOf(drawn);
    const spans = path.match(/C /g)?.length ?? 0;
    await expect(spans).toBeGreaterThan(2);
    await expect(spans).toBeLessThan(first.length / 2);
    // Every coordinate of the curve, its handles included, is inside the line's own frame.
    // The path is in the line's own px, as its frame's style is; on screen both are scaled by the zoom.
    const frameStyle = drawn instanceof HTMLElement ? drawn.style : undefined;
    const [width, height] = [Number.parseFloat(frameStyle?.width ?? ''), Number.parseFloat(frameStyle?.height ?? '')];
    const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    await expect(Math.min(...xs, ...ys)).toBeGreaterThanOrEqual(0);
    await expect(Math.max(...xs)).toBeLessThanOrEqual(width);
    await expect(Math.max(...ys)).toBeLessThanOrEqual(height);

    await stroke(box(-60, 110));
    await waitFor(() => expect(strokes(canvasElement)).toHaveLength(2));
  },
};
