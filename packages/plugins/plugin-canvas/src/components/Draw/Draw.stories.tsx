//
// Copyright 2026 DXOS.org
//

//
// The canvas's Draw tool (S, after Polyline in the tools panel) in the shared editor. A stroke is drawn in one
// press: the pointer's path is sampled while the button is down, thinned to the points the line needs, and landed as
// a polyline run as a curve through them (`params.smooth`). The board starts with three such lines, so the look is
// there before anything is drawn: an open wave, the wave's points as straight segments, and a loop closed on itself.
//
// Draw shape (W, the tool after it) reads the stroke before it lands: one drawn round a rectangle, an ellipse, a
// triangle or a diamond becomes that shape, squared up on the grid, and any other stroke lands as the line it is.
// The `Shapes` variant is an empty board to try it on.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { type RenderList2D, fromRenderLists2D } from '@dxos/react-ui-canvas';
import { FullEditor, SceneEditorStory } from '@dxos/react-ui-canvas-editor/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type NoteNode, type Point, type PolylineNode, type Scene } from '@dxos/scene';

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

/** An empty board for Draw shape, with what to try written on it. */
const HINT: NoteNode = {
  type: 'note',
  id: 'hint',
  z: 'a-hint',
  center: { x: 0, y: -264 },
  size: { width: 480, height: 180 },
  text: 'Press W, then draw a box, a ring, a triangle or a diamond in one stroke.\n\nPause at each corner of anything else: it lands as straight sides and even curves.',
};

const SHAPES: RenderList2D = { id: 'board', name: 'Board', links: {}, nodes: { [HINT.id]: HINT } };

const DOCUMENTS: Record<'lines' | 'shapes', Scene.SceneDocument> = {
  lines: fromRenderLists2D([BOARD], { root: 'board' }),
  shapes: fromRenderLists2D([SHAPES], { root: 'board' }),
};

type StoryArgs = { board: keyof typeof DOCUMENTS };

const DefaultStory = ({ board }: StoryArgs) => (
  <SceneEditorStory document={DOCUMENTS[board]} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/components/Draw',
  render: DefaultStory,
  args: { board: 'lines' },
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** An empty board to draw shapes on with Sketch (W). */
export const Shapes: Story = { args: { board: 'shapes' } };

type Path = readonly (readonly [number, number])[];

/** The nodes on the canvas whose id starts with `prefix`, as drawn. */
const drawn = (root: HTMLElement, prefix: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-testid="scene-view"] [data-node-id^="${prefix}-"]`),
];

/** The path a line is painted through: its outline is a mask over its frame. */
const pathOf = (node: Element): string => {
  const mask = node.querySelector<HTMLElement>('[style*="mask-image"]')?.style.maskImage ?? '';
  return decodeURIComponent(mask).match(/ d='([^']+)'/)?.[1] ?? '';
};

/** A line through `corners`, a sample every few px, as a pointer reports a stroke. */
const through = (corners: Path): [number, number][] => [
  [corners[0][0], corners[0][1]],
  ...corners
    .slice(1)
    .flatMap((corner, index): [number, number][] =>
      Array.from({ length: 20 }, (_, step) => [
        corners[index][0] + ((corner[0] - corners[index][0]) * (step + 1)) / 20,
        corners[index][1] + ((corner[1] - corners[index][1]) * (step + 1)) / 20,
      ]),
    ),
];

/** A box drawn round in one go, ending a little short of where it began, as a hand leaves it. */
const box = (left: number, top: number): [number, number][] =>
  through([
    [left, top + 100],
    [left, top],
    [left + 160, top],
    [left + 160, top + 100],
    [left + 20, top + 100],
  ]);

/** Strokes on the canvas of `canvasElement`, in screen px from the middle of the view. */
const pointer = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
  const frame = view.getBoundingClientRect();
  const origin = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };
  const at = ([dx, dy]: readonly [number, number]) => ({
    clientX: origin.x + dx,
    clientY: origin.y + dy,
    button: 0,
    pointerId: 1,
  });
  const stroke = async (path: Path) => {
    await fireEvent.pointerDown(view, at(path[0]));
    for (const point of path.slice(1)) {
      await fireEvent.pointerMove(view, at(point));
    }
    await expect(await canvas.findByTestId('freehand-stroke')).toBeInTheDocument();
    await fireEvent.pointerUp(view, at(path[path.length - 1]));
  };
  /** A stroke drawn leg by leg, the hand resting between one and the next: where it rests is read as a corner. */
  const strokeLegs = async (legs: readonly Path[]) => {
    await fireEvent.pointerDown(view, at(legs[0][0]));
    for (const leg of legs) {
      for (const point of leg.slice(1)) {
        await fireEvent.pointerMove(view, at(point));
        await rest(SAMPLE_MS);
      }
      await rest(REST_MS);
    }
    const last = legs[legs.length - 1];
    await fireEvent.pointerUp(view, at(last[last.length - 1]));
  };
  return { view, stroke, strokeLegs };
};

/** How long the hand takes between two samples of a stroke, and how long it rests at a corner, in ms. */
const [SAMPLE_MS, REST_MS] = [4, 220];

/** Real time passing: a stroke's pauses are read from when its samples were taken. */
const rest = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A straight leg of a stroke from `from` to `to`, a sample every twentieth of the way. */
const side = (from: readonly [number, number], to: readonly [number, number]): Path =>
  Array.from({ length: 21 }, (_, step): [number, number] => [
    from[0] + ((to[0] - from[0]) * step) / 20,
    from[1] + ((to[1] - from[1]) * step) / 20,
  ]);

/** A leg that bows from `from` to `to` about `control`, as a parabola does. */
const bow = (
  from: readonly [number, number],
  control: readonly [number, number],
  to: readonly [number, number],
): Path =>
  Array.from({ length: 21 }, (_, step): [number, number] => {
    const share = step / 20;
    const at = (axis: 0 | 1) =>
      (1 - share) ** 2 * from[axis] + 2 * share * (1 - share) * control[axis] + share ** 2 * to[axis];
    return [at(0), at(1)];
  });

/** How many of each command a path has. */
const commands = (path: string) => ({
  lines: path.match(/L /g)?.length ?? 0,
  bows: path.match(/Q /g)?.length ?? 0,
  shut: path.endsWith('Z'),
});

/**
 * 1. The Draw tools share one button in the tools panel, straight after Polyline.
 * 2. Press S, then press, drag and release on the canvas: the stroke is drawn as it goes and lands as one line.
 * 3. The line is a curve, with far fewer points than the pointer passed, and none of it is cut off by its frame.
 * 4. The tool is still in hand: a second stroke needs no key.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const { view, stroke } = await pointer(canvasElement);

    // Draw and Draw shape share one button in the tools panel, which stands straight after Polyline.
    const fold = await within(canvasElement).findByTestId('palette-group-Draw');
    const polyline = canvasElement.querySelector('[data-testid="canvas.tool.node:polyline"]');
    await expect(
      (polyline?.compareDocumentPosition(fold) ?? 0) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
    await expect(within(fold).getByTestId('canvas.tool.node:freehand')).toBeInTheDocument();

    view.focus();
    await userEvent.keyboard('s');
    const first = box(-280, 110);
    await stroke(first);
    await waitFor(() => expect(drawn(canvasElement, 'freehand')).toHaveLength(1));

    const [line] = drawn(canvasElement, 'freehand');
    const path = pathOf(line);
    const spans = path.match(/C /g)?.length ?? 0;
    await expect(spans).toBeGreaterThan(2);
    await expect(spans).toBeLessThan(first.length / 2);
    // Every coordinate of the curve, its handles included, is inside the line's own frame. The path is in the line's
    // own px, as its frame's style is; on screen both are scaled by the zoom.
    const [width, height] = [Number.parseFloat(line.style.width), Number.parseFloat(line.style.height)];
    const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    await expect(Math.min(...xs, ...ys)).toBeGreaterThanOrEqual(0);
    await expect(Math.max(...xs)).toBeLessThanOrEqual(width);
    await expect(Math.max(...ys)).toBeLessThanOrEqual(height);

    await stroke(box(-60, 110));
    await waitFor(() => expect(drawn(canvasElement, 'freehand')).toHaveLength(2));
  },
};

/**
 * 1. Press W: the Draw button in the tools panel shows Sketch.
 * 2. Draw a rough box in one stroke: a rectangle lands, its frame on the grid.
 * 3. Draw a rough ring: an ellipse lands.
 * 4. Draw a rough triangle: a polygon lands, with three sides.
 * 5. Draw a wave: it is no shape, so it lands as a line of even curves.
 * 6. Draw a house, resting at each of its five corners: it lands as five straight sides, its walls upright.
 * 7. Draw a box whose top dips, resting at its corners: three straight sides and one curve.
 * 8. Draw a crescent, resting at its two tips: two curves and no straight side.
 */
export const ShapesTest: Story = {
  args: { board: 'shapes' },
  play: async ({ canvasElement }) => {
    const { view, stroke, strokeLegs } = await pointer(canvasElement);

    /** Whether every edge of a node's frame is a whole number of 12 px grid cells. */
    const onGrid = (node: HTMLElement) =>
      [node.style.left, node.style.top, node.style.width, node.style.height]
        .map(Number.parseFloat)
        .every((length) => Math.abs(length / 12 - Math.round(length / 12)) < 1e-6);

    view.focus();
    await userEvent.keyboard('w');
    // The one Draw button in the tools panel now shows the tool in hand.
    const fold = await within(canvasElement).findByTestId('palette-group-Draw');
    await waitFor(() => expect(within(fold).getByTestId('canvas.tool.node:freehandShape')).toBeInTheDocument());
    await stroke(box(-300, -60));
    await waitFor(() => expect(drawn(canvasElement, 'rect')).toHaveLength(1));
    await expect(onGrid(drawn(canvasElement, 'rect')[0])).toBe(true);
    // Nothing of the stroke itself is left behind.
    await expect(drawn(canvasElement, 'freehandShape')).toHaveLength(0);

    const ring: [number, number][] = Array.from({ length: 48 }, (_, index) => {
      const angle = (index / 48) * 2 * Math.PI;
      return [10 + 70 * Math.cos(angle) + Math.sin(index) * 2, -10 + 70 * Math.sin(angle) + Math.cos(index) * 2];
    });
    await stroke(ring);
    await waitFor(() => expect(drawn(canvasElement, 'ellipse')).toHaveLength(1));
    await expect(onGrid(drawn(canvasElement, 'ellipse')[0])).toBe(true);

    await stroke(
      through([
        [200, -70],
        [280, 50],
        [120, 50],
        [196, -62],
      ]),
    );
    await waitFor(() => expect(drawn(canvasElement, 'polygon')).toHaveLength(1));
    await expect(onGrid(drawn(canvasElement, 'polygon')[0])).toBe(true);

    const wave: [number, number][] = Array.from({ length: 60 }, (_, index) => [
      -300 + index * 6,
      160 + 40 * Math.sin(index / 5),
    ]);
    await stroke(wave);
    await waitFor(() => expect(drawn(canvasElement, 'polyline')).toHaveLength(1));
    await expect(commands(pathOf(drawn(canvasElement, 'polyline')[0])).bows).toBeGreaterThan(1);
    await expect(drawn(canvasElement, 'freehandShape')).toHaveLength(0);

    // A house: walls that lean a little as a hand draws them, a floor, and a roof to a point.
    await strokeLegs([
      side([-560, 330], [-556, 250]),
      side([-556, 250], [-500, 200]),
      side([-500, 200], [-440, 252]),
      side([-440, 252], [-444, 328]),
      side([-444, 328], [-556, 332]),
    ]);
    await waitFor(() => expect(drawn(canvasElement, 'polyline')).toHaveLength(2));
    const house = pathOf(drawn(canvasElement, 'polyline')[1]);
    await expect(commands(house)).toEqual({ lines: 5, bows: 0, shut: true });
    // The path sets out up the left wall, which the hand drew leaning: its two ends are in one column.
    const [, startX, wallX] = house.match(/^M (-?[\d.]+) -?[\d.]+ L (-?[\d.]+) /) ?? [];
    await expect(startX).toBeDefined();
    await expect(startX).toBe(wallX);

    // A box whose top dips.
    await strokeLegs([
      bow([-380, 210], [-310, 330], [-240, 212]),
      side([-240, 212], [-242, 330]),
      side([-242, 330], [-378, 328]),
      side([-378, 328], [-380, 214]),
    ]);
    await waitFor(() => expect(drawn(canvasElement, 'polyline')).toHaveLength(3));
    await expect(commands(pathOf(drawn(canvasElement, 'polyline')[2]))).toEqual({ lines: 3, bows: 1, shut: true });

    // A crescent: out round one arc and back by a shallower one.
    await strokeLegs([bow([-60, 210], [-260, 270], [-56, 332]), bow([-56, 332], [-150, 270], [-62, 214])]);
    await waitFor(() => expect(drawn(canvasElement, 'polyline')).toHaveLength(4));
    await expect(commands(pathOf(drawn(canvasElement, 'polyline')[3]))).toEqual({ lines: 0, bows: 2, shut: true });

    await expect([
      drawn(canvasElement, 'rect').length,
      drawn(canvasElement, 'ellipse').length,
      drawn(canvasElement, 'polygon').length,
    ]).toEqual([1, 1, 1]);
  },
};

/**
 * 1. Press U, then click four points on the canvas and double-click the last: one smooth curve lands through them.
 * 2. Every segment is a cubic, so the line bows one way and then the other without a corner.
 * 3. Double-click the curve: each vertex shows a square, and each segment two control points to drag.
 * 4. The curve keeps its own colour while it is edited: it is not drawn in the selection's colour.
 * 5. Drag a control point: its segment changes, and stays a curve.
 */
export const SplineTest: Story = {
  args: { board: 'shapes' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    const frame = view.getBoundingClientRect();
    const at = ([dx, dy]: readonly [number, number]) => ({
      clientX: frame.left + frame.width / 2 + dx,
      clientY: frame.top + frame.height / 2 + dy,
      button: 0,
      pointerId: 1,
    });
    const press = async (point: readonly [number, number]) => {
      await fireEvent.pointerMove(view, at(point));
      await fireEvent.pointerDown(view, at(point));
      await fireEvent.pointerUp(view, at(point));
    };

    view.focus();
    await userEvent.keyboard('u');
    const points: [number, number][] = [
      [-240, 240],
      [-120, 120],
      [0, 240],
      [120, 120],
    ];
    for (const point of points) {
      await press(point);
    }
    // The band is the curve as it would land.
    await expect(await canvas.findByTestId('vertex-band-curve')).toBeInTheDocument();
    await fireEvent.dblClick(view, at(points[3]));
    await waitFor(() => expect(drawn(canvasElement, 'spline')).toHaveLength(1));
    const [spline] = drawn(canvasElement, 'spline');
    await expect(pathOf(spline).match(/C /g)).toHaveLength(3);
    await expect(pathOf(spline)).not.toContain('L ');

    await fireEvent.dblClick(spline, at([-120, 130]));
    await waitFor(() => expect(canvas.getAllByTestId('vertex-handle')).toHaveLength(4));
    await expect(canvas.getAllByTestId('bend-handle')).toHaveLength(6);
    // Selected and in its edit mode, the line is still drawn in its style's colour, not the selection's.
    await expect(drawn(canvasElement, 'spline')[0].querySelector('.border-focus')).toBeNull();

    const before = pathOf(spline);
    const control = canvasElement.querySelector('[data-testid="bend-handle"][data-segment="1"][data-handle="control"]');
    await expect(control).not.toBeNull();
    if (control) {
      const box = control.getBoundingClientRect();
      const from = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, button: 0, pointerId: 1 };
      await fireEvent.pointerDown(control, from);
      await fireEvent.pointerMove(view, { ...from, clientX: from.clientX + 36, clientY: from.clientY - 72 });
      await fireEvent.pointerUp(view, { ...from, clientX: from.clientX + 36, clientY: from.clientY - 72 });
    }
    await waitFor(() => expect(pathOf(drawn(canvasElement, 'spline')[0])).not.toBe(before));
    await expect(pathOf(drawn(canvasElement, 'spline')[0]).match(/C /g)).toHaveLength(3);
    await expect(canvas.getAllByTestId('bend-handle')).toHaveLength(6);
  },
};
