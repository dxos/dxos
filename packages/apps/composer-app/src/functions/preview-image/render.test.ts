//
// Copyright 2026 DXOS.org
//

import { beforeAll, describe, test } from 'vitest';

import { type Card, type Node, layout, typeBands } from './card.ts';
import { type RenderAssets, loadIcons, phosphorPath, renderCard } from './render.ts';
import { PNG_SIGNATURE, loadRenderAssets, pngSize } from './testing.ts';

let assets: RenderAssets;
beforeAll(async () => {
  assets = await loadRenderAssets();
});

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="currentColor"/></svg>';

const space: Card = {
  kind: 'space',
  name: 'Field notes',
  description: 'Release notes, the roadmap and the onboarding board.',
  icon: 'ph--planet--regular',
  hue: 'teal',
  types: [
    { label: 'Documents', icon: 'ph--text-aa--regular', hue: 'indigo', count: 12 },
    { label: 'Boards', count: 3 },
    { label: 'Tables', count: 2 },
    { label: 'Sketch', count: 1 },
    { label: 'Maps', count: 4 },
  ],
};

const object: Card = {
  kind: 'object',
  title: 'Q4 roadmap',
  type: 'Document',
  description: 'We ship publishing first.',
  icon: 'ph--text-aa--regular',
  hue: 'indigo',
  space: { name: 'Field notes', icon: 'ph--planet--regular', hue: 'teal' },
};

/** Every text run in a laid-out card, in document order. */
const texts = (node: Node | string): string[] =>
  typeof node === 'string' ? [node] : [node.props.children ?? []].flat().flatMap((child) => texts(child));

const images = (node: Node | string): string[] =>
  typeof node === 'string'
    ? []
    : [...(node.props.src ? [node.props.src] : []), ...[node.props.children ?? []].flat().flatMap(images)];

describe('renderCard', () => {
  test('draws a space and an object as 1200×630 PNGs', async ({ expect }) => {
    for (const card of [space, object]) {
      const png = await renderCard(card, { assets, loadIcon: async () => ICON });
      expect([...png.slice(0, 8)]).toEqual(PNG_SIGNATURE);
      expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
    }
  });

  test('draws without the icons it cannot load', async ({ expect }) => {
    const png = await renderCard(space, {
      assets,
      loadIcon: async (id) => {
        throw new Error(id);
      },
    });
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });
});

describe('layout', () => {
  test('a space names its three largest types and sums the rest', ({ expect }) => {
    expect(texts(layout(space, new Map()))).toEqual([
      'Published from Composer',
      'Field notes',
      'Release notes, the roadmap and the onboarding board.',
      'F',
      '12 Documents',
      '3 Boards',
      '2 Tables',
      '5 more',
    ]);
  });

  test('a space with no name or icon is drawn as untitled, with its initial', ({ expect }) => {
    const tree = layout({ kind: 'space', types: [] }, new Map());
    expect(texts(tree)).toEqual(['Published from Composer', 'Untitled space', 'U']);
  });

  test('an object names its type at the top and its space beside the space icon', ({ expect }) => {
    expect(texts(layout(object, new Map()))).toEqual([
      'Document',
      'Q4 roadmap',
      'We ship publishing first.',
      'F',
      'Field notes',
      'Published from Composer',
    ]);
  });

  test('icons are drawn in their hue in place of the initial', async ({ expect }) => {
    const card: Card = { kind: 'space', name: 'Field notes', icon: 'ph--planet--regular', hue: 'teal', types: [] };
    const tree = layout(card, await loadIcons(card, async () => ICON));
    expect(texts(tree)).not.toContain('F');
    expect(decodeURIComponent(images(tree)[0])).toContain('fill="#0f766e"');
  });
});

describe('phosphorPath', () => {
  test('maps an icon id to where the build serves it', ({ expect }) => {
    expect(phosphorPath('ph--planet--regular')).toBe('/phosphor/regular/planet.svg');
    expect(phosphorPath('ph--text-aa--bold')).toBe('/phosphor/bold/text-aa-bold.svg');
    expect(phosphorPath('../../etc/passwd')).toBeUndefined();
    expect(phosphorPath('ph--../x--regular')).toBeUndefined();
  });
});

describe('typeBands', () => {
  test('types that share a hue merge into one band, largest first', ({ expect }) => {
    const bands = typeBands([
      { label: 'Tasks', hue: 'neutral', count: 5 },
      { label: 'Text', hue: 'green', count: 4 },
      { label: 'People', hue: 'neutral', count: 3 },
      { label: 'Documents', hue: 'green', count: 2 },
      { label: 'Boards', hue: 'indigo', count: 1 },
    ]);
    expect(bands.map(({ weight }) => weight)).toEqual([8, 6, 1]);
    expect(new Set(bands.map(({ color }) => color)).size).toBe(3);
  });
});
