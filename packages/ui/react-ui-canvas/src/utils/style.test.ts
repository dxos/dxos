//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Node, type StyleMap } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { CLASSIC_LOOK, defaultThemeRegistry, resolveLook } from '../model/index.ts';
import {
  canvasFillClass,
  classedLink,
  classedNode,
  frameClasses,
  hueClasses,
  splitClassEdit,
  surfaceClasses,
} from './style.ts';

describe('style classes', () => {
  const styles: StyleMap = {
    warn: { id: 'warn', name: 'Warning', style: { hue: 'red', lineStyle: 'dashed', rounded: true } },
  };
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    views: [{ nodes, links }],
  } = ViewBuilder.view('s', [
    ViewBuilder.rect('a', box).properties({ class: 'warn', style: { hue: 'blue' } }),
    ViewBuilder.rect('b', { ...box, x: 400 }).properties({ class: 'gone' }),
    ViewBuilder.link('line', 'a', 'b')
      .id('l')
      .properties({ class: 'warn', style: { lineStyle: 'solid' } }),
  ]).build();

  test('an element takes its class look under its own', ({ expect }) => {
    expect(classedNode(nodes.a, styles).style).toEqual({ hue: 'blue', lineStyle: 'dashed', rounded: true });
    // A link takes only what its style shares with the class's: its colour, line style and caption size.
    expect(classedLink(links.l, styles).style).toEqual({ hue: 'red', lineStyle: 'solid' });
    const sized = { warn: { ...styles.warn, style: { ...styles.warn.style, fontSize: 18 } } };
    expect(classedLink(links.l, sized).style).toEqual({ hue: 'red', lineStyle: 'solid', fontSize: 18 });
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
    views: [{ nodes }],
  } = ViewBuilder.view('s', [
    ViewBuilder.rect('plain', box),
    ViewBuilder.rect('blue', box).properties({ style: { hue: 'blue' } }),
    ViewBuilder.rect('strong', box).properties({ style: { hue: 'red', tone: 1, rounded: true } }),
    ViewBuilder.rect('outline', box).properties({ style: { hue: 'teal', tone: 0, lineStyle: 'dotted' } }),
    ViewBuilder.rect('bare', box).properties({ style: { hue: 'pink', fill: false, border: false } }),
    ViewBuilder.rect('guide', box).properties({ style: { hue: 'green', guide: true } }),
    ViewBuilder.ellipse('round', box).properties({ style: { hue: 'violet', tone: 3 } }),
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
    const classic = CLASSIC_LOOK;
    for (const [id, classes] of Object.entries(before)) {
      const node: Node = nodes[id];
      expect(frameClasses(node, false, false, false, classic)).toEqual(classes);
    }
    // Classic's variants are the canvas's four tones, class for class.
    for (const tone of [0, 1, 2, 3] as const) {
      expect(surfaceClasses('blue', tone, classic)).toEqual(hueClasses('blue', tone));
      expect(surfaceClasses(undefined, tone, classic)).toEqual(hueClasses(undefined, tone));
    }
    expect(surfaceClasses('blue', undefined, classic)).toEqual(hueClasses('blue'));
  });

  test('another set restyles the same nodes', ({ expect }) => {
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    // Glass's default variant is frost, its light tokens on paper.
    expect(frameClasses(nodes.blue, false, false, false, glass)).toEqual([
      'bg-white/55',
      'text-blue-800',
      'border-blue-900/15',
      '',
      'rounded-lg',
    ]);
    const outline = resolveLook(defaultThemeRegistry, { theme: 'outline' });
    // Outline has no fill and labels in the default text colour; a theme hue outside the pickers draws as the nearest.
    expect(frameClasses(nodes.blue, false, false, false, outline).slice(0, 2)).toEqual(['bg-transparent', '']);
    expect(surfaceClasses('pink', 2, outline).border).toBe(surfaceClasses('red', 2, outline).border);
    // Each tone picks a variant: glass's tint at 2, and outline's dashed border at 2.
    expect(surfaceClasses('blue', 2, glass)).toEqual({
      surface: 'bg-blue-100/60',
      text: 'text-blue-900',
      border: 'border-blue-900/15',
    });
    expect(frameClasses(nodes.outline, false, false, false, outline)[3]).toBe('border-dotted');
    expect(frameClasses(nodes.blue, false, false, false, outline)[3]).toBe('');
    // Selection still draws in the focus colour.
    expect(frameClasses(nodes.blue, true, false, false, glass)[2]).toBe('border-focus');
  });

  test('soft shapes are the ground colour, hue only accents them, and a selected one is pressed in', ({ expect }) => {
    const soft = resolveLook(defaultThemeRegistry, { theme: 'soft' });
    const [surface, text, border] = frameClasses(nodes.blue, false, false, false, soft);
    expect(surface).toBe('bg-(--dx-soft-ground) shadow-(--dx-soft-raised)');
    expect(text).toBe('text-blue-700 dark:text-blue-300');
    expect(border).toBe('border-blue-500/45 dark:border-blue-400/45');
    // A shape with no hue is pure relief: no edge of its own.
    expect(frameClasses(nodes.plain, false, false, false, soft)[2]).toBe('border-transparent');
    // Selected: the same ground pressed in, with the focus outline kept.
    const selected = frameClasses(nodes.blue, true, false, false, soft);
    expect(selected[0]).toBe('bg-(--dx-soft-ground) shadow-(--dx-soft-pressed)');
    expect(selected[2]).toBe('border-focus');
    // Other sets have no pressed state, so selection leaves their fill alone.
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    expect(frameClasses(nodes.blue, true, false, false, glass)[0]).toBe('bg-white/55');
  });

  test('the canvas fill under captions and hollow markers is the soft ground on a soft background', ({ expect }) => {
    const soft = resolveLook(defaultThemeRegistry, { theme: 'soft' });
    expect(canvasFillClass(soft, 'opaque')).toBe('fill-(--dx-soft-ground)');
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    expect(canvasFillClass(glass, 'opaque')).toBe('fill-white');
  });
});
