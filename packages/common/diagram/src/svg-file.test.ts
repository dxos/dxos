//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Dsl from './dsl/index.ts';
import { toSvgFile } from './svg-file.ts';

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
      Dsl.compile(`
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
    const svg = toSvgFile(Dsl.toScene(commands).objects);
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
    const svg = toSvgFile(Dsl.parseScene('object e @ 0,0 { arrow a 0,0 -> 100,0 }').scene.objects);
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
    const svg = toSvgFile(Dsl.parseScene('object e @ 0,0 { arrow a 0,0 -> 100,0 }').scene.objects);
    expect(svg).toContain('fill="var(--surface-bg, #ffffff)"');
    expect(svg).not.toMatch(/var\(--[\w-]+\)/);
  });
});
