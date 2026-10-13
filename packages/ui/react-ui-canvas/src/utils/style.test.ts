//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type StyleMap } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { classedLink, classedNode, frameClasses, splitClassEdit } from './style.ts';

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
