//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_LOOK, defaultStyleSetRegistry, resolveLook } from '../model/style-set.ts';
import { type Node, type StyleMap } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { classedLink, classedNode, frameClasses, hueClasses, splitClassEdit, surfaceClasses } from './style.ts';

describe('style classes', () => {
  const styles: StyleMap = {
    warn: { id: 'warn', name: 'Warning', style: { hue: 'red', lineStyle: 'dashed', rounded: true } },
  };
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    scenes: [{ nodes, links }],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('a', box).properties({ class: 'warn', style: { hue: 'blue' } }),
    SceneBuilder.rect('b', { ...box, x: 400 }).properties({ class: 'gone' }),
    SceneBuilder.link('line', 'a', 'b')
      .id('l')
      .properties({ class: 'warn', style: { lineStyle: 'solid' } }),
  ]).build();

  test('an element takes its class look under its own', ({ expect }) => {
    expect(classedNode(nodes.a, styles).style).toEqual({ hue: 'blue', lineStyle: 'dashed', rounded: true });
    // A link takes only the common base of the class's style: its colour and line style.
    expect(classedLink(links.l, styles).style).toEqual({ hue: 'red', lineStyle: 'solid' });
  });

  test("a node's line style draws its border", ({ expect }) => {
    expect(frameClasses(classedNode(nodes.a, styles), false)).toEqual(expect.arrayContaining(['border-dashed']));
  });

  test('a missing class leaves the element as it is', ({ expect }) => {
    expect(classedNode(nodes.b, styles)).toBe(nodes.b);
  });

  test('an edit of a classed look goes to the class, and the element stops overriding it', ({ expect }) => {
    // A shows blue over the class's red; the user picks green and turns rounding off.
    const shown = classedNode(nodes.a, styles).style;
    const edited = { hue: 'green', rounded: false };
    expect(splitClassEdit(shown, edited, styles.warn.style ?? {}, nodes.a.style)).toEqual({
      classLook: { hue: 'green', lineStyle: 'dashed', rounded: false },
      own: {},
    });
    // An unchanged field stays where it was: A keeps its own blue, the class its red.
    expect(splitClassEdit(shown, { ...shown, rounded: false }, styles.warn.style ?? {}, nodes.a.style)).toEqual({
      classLook: { hue: 'red', lineStyle: 'dashed', rounded: false },
      own: { hue: 'blue' },
    });
  });
});

describe('style sets', () => {
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    scenes: [{ nodes }],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('plain', box),
    SceneBuilder.rect('blue', box).properties({ style: { hue: 'blue' } }),
    SceneBuilder.rect('strong', box).properties({ style: { hue: 'red', tone: 1, rounded: true } }),
    SceneBuilder.rect('outline', box).properties({ style: { hue: 'teal', tone: 0, lineStyle: 'dotted' } }),
    SceneBuilder.rect('bare', box).properties({ style: { hue: 'pink', fill: false, border: false } }),
    SceneBuilder.rect('guide', box).properties({ style: { hue: 'green', guide: true } }),
    SceneBuilder.ellipse('round', box).properties({ style: { hue: 'violet', tone: 3 } }),
  ]).build();

  // The classes every node drew before style sets, spelled out so a change to the classic look fails here.
  const before: Record<string, string[]> = {
    plain: ['bg-base-surface', '', 'border-separator', '', 'rounded-sm'],
    blue: ['bg-blue-surface', 'text-blue-fg', 'border-blue-border', '', 'rounded-sm'],
    strong: ['bg-red-500', 'text-neutral-50', 'border-red-border', '', 'rounded-2xl'],
    outline: ['bg-transparent', '', 'border-teal-border', 'border-dotted', 'rounded-sm'],
    bare: ['', 'text-pink-fg', 'border-transparent', '', 'rounded-sm'],
    guide: ['', '', 'border-green-border', 'border-dashed', 'rounded-sm'],
    round: ['bg-violet-300', 'text-violet-900', 'border-violet-border', '', 'rounded-[50%]'],
  };

  test('classic draws every node exactly as before', ({ expect }) => {
    const classic = resolveLook(defaultStyleSetRegistry, 'classic', undefined);
    for (const [id, classes] of Object.entries(before)) {
      const node: Node = nodes[id];
      expect(frameClasses(node, false)).toEqual(classes);
      expect(frameClasses(node, false, false, false, classic)).toEqual(classes);
      expect(frameClasses(node, false, false, false, DEFAULT_LOOK)).toEqual(classes);
    }
    expect(surfaceClasses('blue', 1, classic)).toEqual(hueClasses('blue', 1));
  });

  test('another set restyles the same nodes', ({ expect }) => {
    const glass = resolveLook(defaultStyleSetRegistry, 'glass', 'paper');
    expect(frameClasses(nodes.blue, false, false, false, glass)).toEqual([
      'bg-blue-100/60',
      'text-blue-900',
      'border-blue-900/15',
      '',
      'rounded-lg',
    ]);
    const outline = resolveLook(defaultStyleSetRegistry, 'outline', 'plain');
    // Outline has no fill and labels in the default text colour; a theme hue outside the pickers draws as the nearest.
    expect(frameClasses(nodes.blue, false, false, false, outline).slice(0, 2)).toEqual(['bg-transparent', '']);
    expect(surfaceClasses('pink', 2, outline).border).toBe(surfaceClasses('red', 2, outline).border);
    // Selection still draws in the focus colour.
    expect(frameClasses(nodes.blue, true, false, false, glass)[2]).toBe('border-focus');
  });
});
