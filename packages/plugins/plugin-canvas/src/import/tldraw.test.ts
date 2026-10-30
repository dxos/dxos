//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { sortByZ } from '@dxos/react-ui-canvas/headless';
import { MAJOR_GRID, Scene } from '@dxos/scene';

import { frameWithChildren, groupAndRotation, shapesAndArrow, textNoteAndFreeArrow, twoPages } from './testing.ts';
import { nearestHue, tldrawToLayout, tldrawToViews } from './tldraw.ts';

describe('tldrawToViews', () => {
  test('geo shapes map to rect and ellipse nodes, and a bound arrow to a link between them', ({ expect }) => {
    const { root, views, skipped, approximated } = tldrawToViews(shapesAndArrow(), { snap: false });
    expect(root).toBe('root');
    expect(skipped).toEqual({});
    expect(approximated).toEqual({});
    const { nodes, links } = views.root;

    expect(nodes.box).toMatchObject({
      type: 'rect',
      center: { x: 100, y: 50 },
      size: { width: 200, height: 100 },
      label: 'Box',
      style: { hue: 'blue', tone: 1, lineStyle: 'dashed' },
    });
    expect(nodes.oval).toMatchObject({
      type: 'ellipse',
      center: { x: 460, y: 40 },
      size: { width: 120, height: 80 },
      label: 'Oval',
      style: { hue: 'red', tone: 3, fontSize: 26 },
    });
    expect(links.arrow).toMatchObject({
      type: 'line',
      source: { node: 'box' },
      target: { node: 'oval' },
      text: 'calls',
      ends: { end: 'arrow' },
      style: { hue: 'teal' },
    });
    // Paint order follows the tldraw index.
    expect(sortByZ([...Object.values(nodes), ...Object.values(links)]).map(({ id }) => id)).toEqual([
      'box',
      'oval',
      'arrow',
    ]);
  });

  test('text becomes a note, a sticky a filled rect, and an unbound arrow a link with free ends', ({ expect }) => {
    const { views, skipped, approximated } = tldrawToViews(textNoteAndFreeArrow(), { snap: false });
    const { nodes, links } = views.root;
    expect(skipped).toEqual({ draw: 1 });
    expect(approximated).toEqual({ 'geo:star': 1, 'geo:hexagon': 1 });

    expect(nodes.text).toMatchObject({
      type: 'note',
      text: 'Title\nSubtitle',
      size: { width: 240, height: 97 },
      style: { hue: 'violet', fontSize: 36, fontFamily: 'monospace', alignHorizontal: 'center' },
    });
    expect(nodes.sticky).toMatchObject({
      type: 'rect',
      label: 'Remember',
      center: { x: 400, y: 100 },
      size: { width: 200, height: 200 },
      style: { hue: 'amber' },
    });
    expect(nodes.sticky.style).not.toHaveProperty('tone');
    expect(nodes.star).toMatchObject({ type: 'rect' });
    expect(nodes.cloud).toMatchObject({ type: 'cloud', label: 'Sky' });
    expect(nodes.hexagon).toMatchObject({ type: 'polygon', params: { sides: 6 } });
    expect(links.free).toMatchObject({
      type: 'curve',
      source: { point: { x: 10, y: 300 } },
      target: { point: { x: 160, y: 350 } },
      ends: { start: 'circle', end: 'triangle' },
    });
  });

  test('a frame becomes a labelled rectangle on the frames layer, its shapes beside it, arrows bound across it', ({
    expect,
  }) => {
    const { views } = tldrawToViews(frameWithChildren(), { snap: false });
    // tldraw has no nested scenes: everything stays in the root View.
    expect(Object.keys(views)).toEqual(['root']);
    const { nodes, links, layers } = views.root;

    expect(nodes.frame).toMatchObject({
      type: 'rect',
      label: 'Stage',
      layer: 'frames',
      center: { x: 300, y: 250 },
      size: { width: 400, height: 300 },
      style: { tone: 0, alignHorizontal: 'left', alignVertical: 'top' },
    });
    // The frames layer is under the content layer, which every other element names.
    expect(layers?.frames?.z.localeCompare(layers?.layer?.z ?? '')).toBe(-1);
    expect(nodes['inner-a']).toMatchObject({ center: { x: 170, y: 170 }, label: 'A', layer: 'layer' });
    expect(nodes['inner-b']).toMatchObject({ center: { x: 400, y: 300 }, label: 'B', layer: 'layer' });
    expect(links['inner-arrow']).toMatchObject({
      source: { node: 'inner-a' },
      target: { node: 'inner-b' },
      layer: 'layer',
    });

    // The arrow from outside the frame stays bound to the shape inside it.
    expect(links.cross).toMatchObject({ source: { node: 'outside' }, target: { node: 'inner-a' } });
  });

  test('a group becomes an anonymous Object placed by an Instance; rotation carries over', ({ expect }) => {
    const { views, approximated } = tldrawToViews(groupAndRotation(), { snap: false });
    const { nodes, links } = views.root;
    expect(approximated).toEqual({});

    // Half a turn about its corner: the centre is up and to the left of the origin, and the node keeps the turn.
    expect(nodes.tilted).toMatchObject({ center: { x: -50, y: -30 }, size: { width: 100, height: 60 }, rotation: 180 });

    // The group is replaced by an Instance over the members' bounds: turned a quarter about (1000, 0), the members'
    // centres land at (975, 50) and (975, 250).
    expect(nodes.group).toMatchObject({ type: 'instance', composite: 'group-object', center: { x: 975, y: 150 } });
    expect(nodes).not.toHaveProperty('member');
    expect(nodes).not.toHaveProperty('partner');

    const object = views['group-object'];
    expect(object).toMatchObject({ kind: 'composite', anonymous: true });
    // Members keep the group's turn and are re-centred on the Instance.
    expect(object.nodes.member).toMatchObject({ center: { x: 0, y: -100 }, rotation: 90, exposed: true });
    expect(object.nodes.partner).toMatchObject({ center: { x: 0, y: 100 }, rotation: 90 });
    expect(object.links.pair).toMatchObject({ source: { node: 'member' }, target: { node: 'partner' } });

    // The arrow from outside stays in the root, attached to the Instance's port for the member it was bound to.
    expect(links.tie).toMatchObject({ source: { node: 'neighbour' }, target: { node: 'group', port: 'member' } });
    expect(nodes.group.ports).toEqual([expect.objectContaining({ id: 'member' })]);
    // The Instance paints where its lowest member did, below the shapes drawn after the group.
    expect(nodes.group.z < nodes.tilted.z).toBe(true);

    // A polyline in the group joins no node, so it stays in the root: a chain of line links with free ends.
    expect(links.polyline).toMatchObject({
      type: 'line',
      source: { point: { x: 900, y: 0 } },
      target: { point: { x: 900, y: 100 } },
      style: { hue: 'orange', lineStyle: 'dotted' },
    });
    expect(links['polyline-1']).toMatchObject({
      source: { point: { x: 900, y: 100 } },
      target: { point: { x: 800, y: 100 } },
    });
  });

  test('only the first page is imported', ({ expect }) => {
    const { views, skipped } = tldrawToViews(twoPages(), { root: 'main', snap: false });
    expect(Object.keys(views)).toEqual(['main']);
    expect(Object.keys(views.main.nodes)).toEqual(['first']);
    expect(skipped).toEqual({ page: 1 });
  });

  test('an empty document maps to an empty root View', ({ expect }) => {
    expect(tldrawToViews({}).views).toEqual({ root: { id: 'root', nodes: {}, links: {} } });
  });
});

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
    const { views } = tldrawToViews(shapesAndArrow());
    const exact = tldrawToViews(shapesAndArrow(), { snap: false }).views;
    for (const node of Object.values(views.root.nodes)) {
      const left = node.center.x - node.size.width / 2;
      const top = node.center.y - node.size.height / 2;
      for (const value of [left, top, node.size.width, node.size.height]) {
        expect(value % MAJOR_GRID).toBe(0);
      }
      expect(node.size.width).toBeGreaterThanOrEqual(MAJOR_GRID);
      // Within half a cell of where tldraw drew it.
      const source = exact.root.nodes[node.id];
      expect(Math.abs(left - (source.center.x - source.size.width / 2))).toBeLessThanOrEqual(MAJOR_GRID / 2);
    }
  });

  test('a snapped frame grows out to the grid, so it still holds its shapes', ({ expect }) => {
    const { nodes } = tldrawToViews(frameWithChildren()).views.root;
    const bounds = (id: string) => {
      const { center, size } = nodes[id];
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
