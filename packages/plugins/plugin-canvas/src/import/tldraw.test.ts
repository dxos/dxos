//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sortByZ } from '@dxos/react-ui-canvas/headless';

import { frameWithChildren, groupAndRotation, shapesAndArrow, textNoteAndFreeArrow, twoPages } from './testing.ts';
import { nearestHue, tldrawToScenes } from './tldraw.ts';

describe('tldrawToScenes', () => {
  test('geo shapes map to rect and ellipse nodes, and a bound arrow to a link between them', ({ expect }) => {
    const { root, scenes, skipped, approximated } = tldrawToScenes(shapesAndArrow());
    expect(root).toBe('root');
    expect(skipped).toEqual({});
    expect(approximated).toEqual({});
    const { nodes, links } = scenes.root;

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
    const { scenes, skipped, approximated } = tldrawToScenes(textNoteAndFreeArrow());
    const { nodes, links } = scenes.root;
    expect(skipped).toEqual({ draw: 1 });
    expect(approximated).toEqual({ 'geo:star': 1 });

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
    expect(links.free).toMatchObject({
      type: 'curve',
      source: { point: { x: 10, y: 300 } },
      target: { point: { x: 160, y: 350 } },
      ends: { start: 'circle', end: 'triangle' },
    });
  });

  test('a frame becomes a frame node over a child scene; links bind only within a scene', ({ expect }) => {
    const { scenes } = tldrawToScenes(frameWithChildren());
    expect(Object.keys(scenes).sort()).toEqual(['frame-scene', 'root']);

    const frame = scenes.root.nodes.frame;
    expect(frame).toMatchObject({
      type: 'frame',
      scene: 'frame-scene',
      label: 'Stage',
      link: { contents: true },
      center: { x: 300, y: 250 },
      size: { width: 400, height: 300 },
    });

    const child = scenes['frame-scene'];
    expect(child.name).toBe('Stage');
    // The child scene is centred on the frame: its top-left corner is at (-200, -150).
    expect(child.nodes['inner-a']).toMatchObject({ center: { x: -130, y: -80 }, label: 'A' });
    expect(child.nodes['inner-b']).toMatchObject({ center: { x: 100, y: 50 }, label: 'B' });
    expect(child.links['inner-arrow']).toMatchObject({ source: { node: 'inner-a' }, target: { node: 'inner-b' } });

    // The arrow on the page is bound to a shape inside the frame, a different scene, so that end is left free.
    expect(scenes.root.links.cross).toMatchObject({
      source: { node: 'outside' },
      target: { point: { x: 300, y: 150 } },
    });
  });

  test('a group is flattened into its container and rotation keeps the rotated centre', ({ expect }) => {
    const { scenes, approximated } = tldrawToScenes(groupAndRotation());
    const { nodes, links } = scenes.root;
    expect(approximated).toEqual({ group: 1, rotation: 2 });

    // The group is turned a quarter about (1000, 0): the member's centre (50, 25) lands at (975, 50).
    expect(nodes.member).toMatchObject({ type: 'rect', center: { x: 975, y: 50 }, size: { width: 100, height: 50 } });
    expect(nodes).not.toHaveProperty('group');
    // Half a turn about its corner: the centre is up and to the left of the origin.
    expect(nodes.tilted).toMatchObject({ center: { x: -50, y: -30 }, size: { width: 100, height: 60 } });

    // A straight polyline becomes a chain of line links with free ends.
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
    const { scenes, skipped } = tldrawToScenes(twoPages(), { root: 'main' });
    expect(Object.keys(scenes)).toEqual(['main']);
    expect(Object.keys(scenes.main.nodes)).toEqual(['first']);
    expect(skipped).toEqual({ page: 1 });
  });

  test('an empty document maps to an empty root scene', ({ expect }) => {
    expect(tldrawToScenes({}).scenes).toEqual({ root: { id: 'root', nodes: {}, links: {} } });
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
});
