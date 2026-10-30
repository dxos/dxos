//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { sortByZ } from '@dxos/react-ui-canvas/headless';
import { MAJOR_GRID, Scene } from '@dxos/scene';

import { frameWithChildren, groupAndRotation, shapesAndArrow, textNoteAndFreeArrow, twoPages } from './testing.ts';
import { nearestHue, tldrawToLayout } from './tldraw.ts';

describe('tldrawToLayout shapes', () => {
  test('geo shapes map to rect and ellipse elements, and a bound arrow to a link between them', ({ expect }) => {
    const { layout, skipped, approximated } = tldrawToLayout(shapesAndArrow(), { snap: false });
    expect(layout.id).toBe('root');
    expect(skipped).toEqual({});
    expect(approximated).toEqual({});
    const { elements } = layout;

    expect(elements.box).toMatchObject({
      type: 'rect',
      center: { x: 100, y: 50 },
      size: { width: 200, height: 100 },
      label: 'Box',
      overrides: { hue: 'blue', tone: 1, lineStyle: 'dashed' },
    });
    expect(elements.oval).toMatchObject({
      type: 'ellipse',
      center: { x: 460, y: 40 },
      size: { width: 120, height: 80 },
      label: 'Oval',
      overrides: { hue: 'red', tone: 3, fontSize: 26 },
    });
    expect(elements.arrow).toMatchObject({
      type: 'link',
      source: { node: 'box' },
      target: { node: 'oval' },
      label: 'calls',
      overrides: { hue: 'teal' },
      props: { canvas: { type: 'line', ends: { end: 'arrow' } } },
    });
    // Paint order follows the tldraw index.
    expect(sortByZ(Object.values(elements).map(({ id, z }) => ({ id, z: z ?? '' }))).map(({ id }) => id)).toEqual([
      'box',
      'oval',
      'arrow',
    ]);
  });

  test('text becomes a note, a sticky a filled rect, and an unbound arrow a link with free ends', ({ expect }) => {
    const { layout, skipped, approximated } = tldrawToLayout(textNoteAndFreeArrow(), { snap: false });
    const { elements } = layout;
    expect(skipped).toEqual({ draw: 1 });
    expect(approximated).toEqual({ 'geo:star': 1, 'geo:hexagon': 1 });

    expect(elements.text).toMatchObject({
      type: 'note',
      size: { width: 240, height: 97 },
      overrides: { hue: 'violet', fontSize: 36, fontFamily: 'monospace', alignHorizontal: 'center' },
      props: { canvas: { text: 'Title\nSubtitle' } },
    });
    expect(elements.sticky).toMatchObject({
      type: 'rect',
      label: 'Remember',
      center: { x: 400, y: 100 },
      size: { width: 200, height: 200 },
      overrides: { hue: 'amber' },
    });
    expect(elements.sticky.overrides).not.toHaveProperty('tone');
    expect(elements.star).toMatchObject({ type: 'rect' });
    expect(elements.cloud).toMatchObject({ type: 'cloud', label: 'Sky' });
    expect(elements.hexagon).toMatchObject({ type: 'polygon', props: { canvas: { params: { sides: 6 } } } });
    expect(elements.free).toMatchObject({
      type: 'link',
      source: { point: { x: 10, y: 300 } },
      target: { point: { x: 160, y: 350 } },
      props: { canvas: { type: 'curve', ends: { start: 'circle', end: 'triangle' } } },
    });
  });

  test('a frame becomes a labelled rectangle on the frames layer, its shapes beside it, arrows bound across it', ({
    expect,
  }) => {
    const { layout, parts } = tldrawToLayout(frameWithChildren(), { snap: false });
    // tldraw has no nested scenes: everything stays in the page's layout.
    expect(parts).toEqual([]);
    const { elements, layers } = layout;

    expect(elements.frame).toMatchObject({
      type: 'rect',
      label: 'Stage',
      layer: 'frames',
      center: { x: 300, y: 250 },
      size: { width: 400, height: 300 },
      overrides: { tone: 0, alignHorizontal: 'left', alignVertical: 'top' },
    });
    // The frames layer is under the content layer, which every other element names.
    expect(layers?.frames?.z.localeCompare(layers?.layer?.z ?? '')).toBe(-1);
    expect(elements['inner-a']).toMatchObject({ center: { x: 170, y: 170 }, label: 'A', layer: 'layer' });
    expect(elements['inner-b']).toMatchObject({ center: { x: 400, y: 300 }, label: 'B', layer: 'layer' });
    expect(elements['inner-arrow']).toMatchObject({
      source: { node: 'inner-a' },
      target: { node: 'inner-b' },
      layer: 'layer',
    });

    // The arrow from outside the frame stays bound to the shape inside it.
    expect(elements.cross).toMatchObject({ source: { node: 'outside' }, target: { node: 'inner-a' } });
  });

  test('a group becomes an anonymous composite placed by one element; rotation carries over', ({ expect }) => {
    const { layout, parts, objects, approximated } = tldrawToLayout(groupAndRotation(), { snap: false });
    const { elements } = layout;
    expect(approximated).toEqual({});

    // Half a turn about its corner: the centre is up and to the left of the origin, and the shape keeps the turn.
    expect(elements.tilted).toMatchObject({
      center: { x: -50, y: -30 },
      size: { width: 100, height: 60 },
      rotation: 180,
    });

    // The group is replaced by an element placing the composite over the members' bounds: turned a quarter about
    // (1000, 0), the members' centres land at (975, 50) and (975, 250).
    expect(elements.group).toMatchObject({
      object: 'instance:group-object',
      center: { x: 975, y: 150 },
      props: { canvas: { type: 'instance', composite: 'group-object' } },
    });
    expect(objects).toEqual([{ id: 'instance:group-object', type: 'rect', parts: 'group-object' }]);
    expect(elements).not.toHaveProperty('member');
    expect(elements).not.toHaveProperty('partner');
    // The link wholly inside the group moved with it.
    expect(elements).not.toHaveProperty('pair');

    const [object] = parts;
    expect(object).toMatchObject({ id: 'group-object', kind: 'composite', anonymous: true });
    // Members keep the group's turn and are re-centred on the placing element.
    expect(object.elements.member).toMatchObject({
      center: { x: 0, y: -100 },
      rotation: 90,
      props: { canvas: { exposed: true } },
    });
    expect(object.elements.partner).toMatchObject({ center: { x: 0, y: 100 }, rotation: 90 });
    expect(object.elements.pair).toMatchObject({ source: { node: 'member' }, target: { node: 'partner' } });

    // The arrow from outside stays in the page, attached to the placing element's port for the member it was bound to.
    expect(elements.tie).toMatchObject({ source: { node: 'neighbour' }, target: { node: 'group', port: 'member' } });
    expect(elements.group.props?.canvas).toMatchObject({ ports: [expect.objectContaining({ id: 'member' })] });
    // The placing element paints where its lowest member did, below the shapes drawn after the group.
    expect((elements.group.z ?? '') < (elements.tilted.z ?? '')).toBe(true);

    // A polyline in the group joins no shape, so it stays in the page: a chain of line links with free ends.
    expect(elements.polyline).toMatchObject({
      type: 'link',
      source: { point: { x: 900, y: 0 } },
      target: { point: { x: 900, y: 100 } },
      overrides: { hue: 'orange', lineStyle: 'dotted' },
      props: { canvas: { type: 'line' } },
    });
    expect(elements['polyline-1']).toMatchObject({
      source: { point: { x: 900, y: 100 } },
      target: { point: { x: 800, y: 100 } },
    });
  });

  test('only the first page is imported', ({ expect }) => {
    const { layout, parts, skipped } = tldrawToLayout(twoPages(), { root: 'main', snap: false });
    expect(layout.id).toBe('main');
    expect(parts).toEqual([]);
    expect(Object.keys(layout.elements)).toEqual(['first']);
    expect(skipped).toEqual({ page: 1 });
  });

  test('an empty document maps to an empty page layout', ({ expect }) => {
    expect(tldrawToLayout({})).toMatchObject({
      layout: { id: 'root', dim: '2d', elements: {} },
      parts: [],
      objects: [],
      intents: [],
    });
  });
});

/** The shapes among `elements`, each with the frame every shape the mapper writes has. */
const shapesOf = (elements: Readonly<Record<string, Scene.Element2D | undefined>>) =>
  Object.values(elements).flatMap((element) =>
    element?.center && element.size ? [{ id: element.id, center: element.center, size: element.size }] : [],
  );

describe('nearestHue', () => {
  test('greys are neutral; colours take the hue nearest them around the wheel', ({ expect }) => {
    expect(nearestHue('black')).toBe('neutral');
    expect(nearestHue('grey')).toBe('neutral');
    expect(nearestHue('white')).toBe('neutral');
    expect(nearestHue('blue')).toBe('blue');
    expect(nearestHue('light-blue')).toBe('blue');
    expect(nearestHue('yellow')).toBe('amber');
    expect(nearestHue('orange')).toBe('orange');
    expect(nearestHue('green')).toBe('teal');
    expect(nearestHue('light-green')).toBe('green');
    expect(nearestHue('red')).toBe('red');
    expect(nearestHue('violet')).toBe('violet');
    expect(nearestHue('unknown')).toBe('neutral');
  });

  test('snaps every frame to the grid the canvas shows by default, keeping at least one cell', ({ expect }) => {
    const { elements } = tldrawToLayout(shapesAndArrow()).layout;
    const exact = tldrawToLayout(shapesAndArrow(), { snap: false }).layout.elements;
    for (const node of shapesOf(elements)) {
      const left = node.center.x - node.size.width / 2;
      const top = node.center.y - node.size.height / 2;
      for (const value of [left, top, node.size.width, node.size.height]) {
        expect(value % MAJOR_GRID).toBe(0);
      }
      expect(node.size.width).toBeGreaterThanOrEqual(MAJOR_GRID);
      // Within half a cell of where tldraw drew it.
      const [source] = shapesOf({ [node.id]: exact[node.id] });
      expect(Math.abs(left - (source.center.x - source.size.width / 2))).toBeLessThanOrEqual(MAJOR_GRID / 2);
    }
  });

  test('a snapped frame grows out to the grid, so it still holds its shapes', ({ expect }) => {
    const { elements } = tldrawToLayout(frameWithChildren()).layout;
    const bounds = (id: string) => {
      const [{ center, size }] = shapesOf({ [id]: elements[id] });
      return {
        left: center.x - size.width / 2,
        top: center.y - size.height / 2,
        right: center.x + size.width / 2,
        bottom: center.y + size.height / 2,
      };
    };
    const frame = bounds('frame');
    for (const value of Object.values(frame)) {
      expect(value % MAJOR_GRID).toBe(0);
    }
    for (const id of ['inner-a', 'inner-b']) {
      const inner = bounds(id);
      expect(inner.left).toBeGreaterThanOrEqual(frame.left);
      expect(inner.top).toBeGreaterThanOrEqual(frame.top);
      expect(inner.right).toBeLessThanOrEqual(frame.right);
      expect(inner.bottom).toBeLessThanOrEqual(frame.bottom);
    }
    // Clear of the frame's corner, where its name is.
    expect(bounds('inner-a').top).toBeGreaterThan(frame.top);
  });
});

describe('tldrawToLayout', () => {
  test('a tldraw page maps to Element2Ds of one 2D layout, frames on their own layer under the content', ({
    expect,
  }) => {
    const { layout, intents } = tldrawToLayout(frameWithChildren(), { root: 'page' });
    expect(layout.id).toBe('page');
    const shapes = Object.values(layout.elements).filter((element) => element.type !== 'link');
    expect(shapes.map((element) => element.id).sort()).toEqual(['frame', 'inner-a', 'inner-b', 'outside']);
    expect(Object.values(layout.elements).every(Schema.is(Scene.Element2D))).toBe(true);
    expect(layout.elements.frame).toMatchObject({ type: 'rect', layer: 'frames' });
    expect(Object.keys(layout.layers ?? {})).toContain('frames');
    // One create per element, shapes before the links bound to them.
    expect(intents.map((intent) => intent.kind === 'create' && intent.element.id).sort()).toEqual(
      Object.keys(layout.elements).sort(),
    );
  });

  test('a bound arrow becomes a link element after the shapes it binds', ({ expect }) => {
    const { layout, intents } = tldrawToLayout(shapesAndArrow(), { snap: false });
    expect(layout.elements.arrow).toMatchObject({ source: { node: 'box' }, target: { node: 'oval' }, label: 'calls' });
    const order = intents.map((intent) => (intent.kind === 'create' ? intent.element.id : ''));
    expect(order.indexOf('arrow')).toBeGreaterThan(Math.max(order.indexOf('box'), order.indexOf('oval')));
  });
});
