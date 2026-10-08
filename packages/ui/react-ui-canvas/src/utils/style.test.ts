//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type StyleMap } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { classedLine, classedNode, ownFields } from './style.ts';

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

  test('saving keeps only what the element sets itself', ({ expect }) => {
    // The panel shows the merged look; an edit of the fill must not copy the class's rounding onto the node.
    const edited = { hue: 'blue', rounded: true, fill: false };
    expect(ownFields(edited, styles.warn.style, nodes.a.style)).toEqual({ hue: 'blue', fill: false });
  });
});
