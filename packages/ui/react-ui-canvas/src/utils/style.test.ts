//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type StyleMap } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { classedLine, classedNode, splitClassEdit } from './style.ts';

describe('style classes', () => {
  const styles: StyleMap = {
    warn: { id: 'warn', name: 'Warning', style: { hue: 'red', rounded: true }, line: { hue: 'red', dash: 'dashed' } },
  };
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    scenes: [{ nodes, links }],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('a', box).properties({ class: 'warn', style: { hue: 'blue' } }),
    SceneBuilder.rect('b', { ...box, x: 400 }).properties({ class: 'gone' }),
    SceneBuilder.link('line', 'a', 'b')
      .id('l')
      .properties({ class: 'warn', line: { dash: 'solid' } }),
  ]).build();

  test('an element takes its class look under its own', ({ expect }) => {
    expect(classedNode(nodes.a, styles).style).toEqual({ hue: 'blue', rounded: true });
    expect(classedLine(links.l, styles)).toEqual({ hue: 'red', dash: 'solid' });
  });

  test('a missing class leaves the element as it is', ({ expect }) => {
    expect(classedNode(nodes.b, styles)).toBe(nodes.b);
  });

  test('an edit of a classed look goes to the class, and the element stops overriding it', ({ expect }) => {
    // A shows blue over the class's red; the user picks green and turns rounding off.
    const shown = classedNode(nodes.a, styles).style;
    const edited = { hue: 'green', rounded: false };
    expect(splitClassEdit(shown, edited, styles.warn.style ?? {}, nodes.a.style)).toEqual({
      classLook: { hue: 'green', rounded: false },
      own: {},
    });
    // An unchanged field stays where it was: A keeps its own blue, the class its red.
    expect(splitClassEdit(shown, { ...shown, rounded: false }, styles.warn.style ?? {}, nodes.a.style)).toEqual({
      classLook: { hue: 'red', rounded: false },
      own: { hue: 'blue' },
    });
  });
});
