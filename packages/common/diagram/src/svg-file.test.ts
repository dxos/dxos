//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as DSL from './dsl/index.ts';
import { PALETTE, colorClass, drawnColor, toSvgFile } from './svg-file.ts';

/** The marker ids an SVG element references, by attribute, with the per-instance prefix dropped. */
const markerRefs = (svg: string, element: string, attribute: 'marker-start' | 'marker-end') =>
  [...svg.matchAll(new RegExp(`<${element}[^>]*${attribute}="url\\(#[^)]*?-([a-z-]+)\\)"`, 'g'))].map(
    (match) => match[1],
  );

describe('box labels', () => {
  test('a label wider than its box wraps inside it, centred, at the full size', ({ expect }) => {
    const svg = toSvgFile([
      {
        id: 'node',
        elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 192, h: 160, text: 'RemoteProcessHandleWithLongName' }],
      },
    ]);
    const label = /<text[^>]*font-size="18"[^>]*>(.*?)<\/text>/.exec(svg)?.[1] ?? '';
    expect([...label.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((match) => match[1])).toEqual([
      'RemoteProcess',
      'HandleWithLong',
      'Name',
    ]);
    // Three lines of 26 centred on the box's middle at 80.
    expect(svg).toMatch(/<text x="96" y="54"/);
  });
});

describe('relation markers', () => {
  test('a laid-out diagram draws each relation with its markers, the source marker at the route start', async ({
    expect,
  }) => {
    const { commands, problems } = await EffectEx.runPromise(
      DSL.compile(`
        node Animal
        node Dog below Animal
        node Owner left-of Dog
        node Leg below Dog
        node Customer @cell(0,3)
        node Order @cell(2,4)
        edge Dog extends Animal
        edge Owner owns Dog
        edge Dog composes Leg
        edge Customer one-to-many Order
      `),
    );
    expect(problems).toEqual([]);
    const svg = toSvgFile(DSL.toScene(commands).objects);
    // Every marker shape is defined once.
    for (const marker of ['triangle', 'diamond', 'diamond-filled', 'one', 'crowsfoot', 'open']) {
      expect(svg).toContain(`-${marker}"`);
    }
    const ends = [...markerRefs(svg, 'line', 'marker-end')];
    const starts = [...markerRefs(svg, 'line', 'marker-start'), ...markerRefs(svg, 'polyline', 'marker-start')];
    expect(ends).toContain('triangle');
    expect(ends).toContain('crowsfoot');
    expect(starts).toEqual(expect.arrayContaining(['diamond', 'diamond-filled', 'one']));
    // Customer to Order is routed with a bend, so its bar sits on the polyline, not the arrow's last run.
    expect(markerRefs(svg, 'polyline', 'marker-start')).toContain('one');
  });

  test('old arrows without a relation keep their arrowhead', ({ expect }) => {
    const svg = toSvgFile(DSL.parseScene('object e @ 0,0 { arrow a 0,0 -> 100,0 }').scene.objects);
    expect(markerRefs(svg, 'line', 'marker-end')).toEqual(['arrow']);
  });
});

describe('renderer fallbacks', () => {
  test('a tinted fill carries a plain color for renderers without color-mix', ({ expect }) => {
    const svg = toSvgFile([
      {
        id: 'group',
        elements: [
          { kind: 'rect', id: 'plain', x: 0, y: 0, w: 100, h: 100, fill: 'tint' },
          { kind: 'rect', id: 'blue', x: 120, y: 0, w: 100, h: 100, fill: 'tint', color: 'light-blue' },
        ],
      },
    ]);
    const tinted = [...svg.matchAll(/<rect[^>]*style="fill:color-mix[^"]*"[^>]*>/g)].map((match) => match[0]);
    expect(tinted).toHaveLength(2);
    // 10% of the ink (#262626) and of sky-500 (#0ea5e9) over the white surface.
    expect(tinted[0]).toContain('fill="#e9e9e9"');
    expect(tinted[1]).toContain('fill="#e7f6fd"');
  });

  test('every custom property names a plain fallback', ({ expect }) => {
    const svg = toSvgFile(DSL.parseScene('object e @ 0,0 { arrow a 0,0 -> 100,0 }').scene.objects);
    expect(svg).toContain('fill="var(--surface-bg, #ffffff)"');
    expect(svg).not.toMatch(/var\(--[\w-]+\)/);
  });
});

describe('colours', () => {
  /** The opening tag of the group each box of `text` is drawn in, in order. */
  const groups = (text: string): string[] => {
    const { scene, problems } = DSL.parseScene(`object e @ 0,0 {\n${text}\n}`);
    if (problems.length > 0) {
      throw new Error(problems.map(({ message }) => message).join(' · '));
    }
    return [...toSvgFile(scene.objects).matchAll(/<g class="stroke[^>]*>/g)].map((match) => match[0]);
  };

  test('every palette name draws as it always has: seven in a colour of their own, the rest in the ink', ({
    expect,
  }) => {
    expect(Object.fromEntries(PALETTE.map((name) => [name, colorClass(name)]))).toEqual({
      'black': undefined,
      'grey': 'text-neutral-400 dark:text-neutral-500',
      'light-violet': 'text-violet-500',
      'violet': undefined,
      'blue': undefined,
      'light-blue': 'text-sky-500',
      'yellow': 'text-amber-500',
      'orange': 'text-orange-500',
      'green': undefined,
      'light-green': 'text-emerald-500',
      'light-red': 'text-rose-500',
      'red': undefined,
      'white': undefined,
    });
    expect(groups('rect a 0,0 10x10 color=light-blue\nrect b 20,0 10x10 color=blue\nrect c 40,0 10x10')).toEqual([
      '<g class="stroke-current text-sky-500" stroke-width="1.5">',
      '<g class="stroke-current" stroke-width="1.5">',
      '<g class="stroke-current" stroke-width="1.5">',
    ]);
  });

  test('a tone picks the light name the palette has at tone 3, and the name itself otherwise', ({ expect }) => {
    expect(drawnColor('blue/3')).toEqual({ name: 'light-blue' });
    expect(drawnColor('red/3')).toEqual({ name: 'light-red' });
    expect(drawnColor('blue/1')).toEqual({ name: 'blue' });
    // No `light-yellow`, and no lighter `light-blue`.
    expect(drawnColor('yellow/3')).toEqual({ name: 'yellow' });
    expect(drawnColor('light-blue/3')).toEqual({ name: 'light-blue' });
    expect(groups('rect a 0,0 10x10 color=blue/3')).toEqual([
      '<g class="stroke-current text-sky-500" stroke-width="1.5">',
    ]);
  });

  test('a CSS literal is drawn as written, and a hue the palette lacks in the ink', ({ expect }) => {
    expect(drawnColor('#1e90ff')).toEqual({ css: '#1e90ff' });
    expect(drawnColor('teal')).toEqual({});
    expect(drawnColor('teal/2')).toEqual({});
    expect(drawnColor(undefined)).toEqual({});
    expect(
      groups(
        'rect a 0,0 10x10 color="#1e90ff"\nrect b 20,0 10x10 color="rgb(30 144 255)"\nrect c 40,0 10x10 color=teal',
      ),
    ).toEqual([
      '<g class="stroke-current" color="#1e90ff" stroke-width="1.5">',
      '<g class="stroke-current" color="rgb(30 144 255)" stroke-width="1.5">',
      '<g class="stroke-current" stroke-width="1.5">',
    ]);
  });

  test('a tint of a literal carries the mix of that colour for renderers without color-mix', ({ expect }) => {
    const svg = toSvgFile(
      DSL.parseScene(
        'object e @ 0,0 {\n  rect a 0,0 10x10 fill=tint color="#1e90ff"\n  rect b 20,0 10x10 fill=tint color="#08f"\n}',
      ).scene.objects,
    );
    const tinted = [...svg.matchAll(/<rect[^>]*style="fill:color-mix[^"]*"[^>]*>/g)].map((match) => match[0]);
    // 10% of #1e90ff, and of #0088ff, over the white surface.
    expect(tinted[0]).toContain('fill="#e9f4ff"');
    expect(tinted[1]).toContain('fill="#e6f3ff"');
  });
});

describe('strokes and fills', () => {
  test('a shape with no stroke draws no outline, and glass draws as a solid surface', ({ expect }) => {
    const svg = toSvgFile(
      DSL.parseScene(
        'object e @ 0,0 {\n  rect label 0,0 10x10 "L" stroke=none\n  rect pane 20,0 10x10 fill=glass\n  rect plain 40,0 10x10\n}',
      ).scene.objects,
    );
    const drawn = [...svg.matchAll(/<g class="(stroke-[a-z]+)[^>]*><rect[^>]*class="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]);
    expect(drawn).toEqual([
      ['stroke-none', 'fill-transparent'],
      ['stroke-current', 'fill-neutral-100 dark:fill-neutral-800'],
      ['stroke-current', 'fill-transparent'],
    ]);
  });
});
