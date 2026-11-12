//
// Copyright 2026 DXOS.org
//

//
// The `card` and `icon` types in the editor: both are built-ins, so they are in the palette beside the rect and the
// ellipse, and this is where to drag one out and look at it. A card is a header of a glyph and a title, a body, and
// a footer under a hairline, each edited in place; an icon is the glyph alone, at any of Phosphor's six weights.
//
// `Composite` draws the same card the other way: a composite object of five primitives (a frame, an icon and three
// texts) placed by `instance` nodes. The two stories are the same picture and a different model, which is the point
// — the Views inspector expands an instance into its parts, and an instance overrides any field of any part
// (`overrides`, merged per key for `style`), so one card's icon is blue without a `tone` property existing.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type IconNode, type RenderList2D, fromRenderLists2D } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type InstanceNode, type Node, type RectNode, type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

type Regions = { label?: string; body?: string; footer?: string };

/** Every size is a whole number of minor units (12px) and every centre puts the edges on a grid line. */
const cardOf = (id: string, z: string, [x, y]: [number, number], icon: string, regions: Regions): Scene.Element2D => ({
  id,
  type: 'card',
  z,
  center: { x, y },
  size: { width: 288, height: 168 },
  props: { canvas: { icon: { type: icon }, ...regions } },
});

const iconOf = (id: string, z: string, [x, y]: [number, number], weight: string): Scene.Element2D => ({
  id,
  type: 'icon',
  z,
  center: { x, y },
  size: { width: 96, height: 96 },
  props: { canvas: { icon: { type: 'command', weight }, label: weight } },
});

/** Which regions a card may carry, and one glyph at four of its weights. */
const DOCUMENT: Scene.SceneDocument = (() => {
  const elements: Scene.Element2D[] = [
    cardOf('full', 'a0', [-336, -120], 'command', {
      label: 'Every region',
      body: 'A header of a glyph and a title, this body, and a footer under a hairline.',
      footer: 'card · all three',
    }),
    cardOf('header', 'a1', [0, -120], 'rocket', { label: 'Header only' }),
    cardOf('footer', 'a2', [336, -120], 'anchor', { label: 'No body', footer: 'card · header and footer' }),
    iconOf('thin', 'a3', [-336, 120], 'thin'),
    iconOf('regular', 'a4', [-120, 120], 'regular'),
    iconOf('bold', 'a5', [120, 120], 'bold'),
    iconOf('fill', 'a6', [336, 120], 'fill'),
  ];
  return {
    scenes: [{ id: 'root', dim: '2d', layout: 'cards', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
    layouts: [
      {
        id: 'cards',
        dim: '2d',
        name: 'Cards',
        elements: Object.fromEntries(elements.map((element) => [element.id, element])),
      },
    ],
    models: [],
  };
})();

//
// The same card as a composite object: a scene marked `kind: 'composite'`, placed by `instance` nodes. The document
// is written through `fromRenderLists2D` rather than by hand, because an instance names its definition through a
// model `Object2D` (`parts`), not a field of its own — writing the element by hand silently makes a node that is not
// an instance, with no parts to expand.
//
// The parts are laid out as `CardFrame` lays out the kind: 12px padding, a 24-unit header, the body under it, and a
// footer on a hairline at the bottom.
//

const CARD_SIZE = { width: 288, height: 168 };

const text = (id: string, z: string, box: [number, number, number, number], label: string, size: number): RectNode => ({
  id,
  type: 'rect',
  z,
  center: { x: box[0] + box[2] / 2, y: box[1] + box[3] / 2 },
  size: { width: box[2], height: box[3] },
  label,
  style: { fill: false, border: false, alignHorizontal: 'left', alignVertical: 'middle', fontSize: size },
});

const glyph = (id: string, z: string, center: { x: number; y: number }, type: string): IconNode => ({
  id,
  type: 'icon',
  z,
  center,
  size: { width: 24, height: 24 },
  icon: { type },
});

/** The definition: a frame, a glyph, a title, a body, a hairline and a footer, on the 12px grid. */
const CARD: RenderList2D = {
  id: 'card',
  name: 'Card',
  kind: 'composite',
  links: {},
  nodes: Object.fromEntries(
    (
      [
        {
          id: 'frame',
          type: 'rect' as const,
          z: 'a0',
          center: { x: 0, y: 0 },
          size: CARD_SIZE,
          style: { rounded: true },
        },
        glyph('icon', 'a1', { x: -120, y: -60 }, 'command'),
        text('title', 'a2', [-84, -72, 192, 24], 'Composite', 18),
        text('body', 'a3', [-132, -36, 264, 48], 'A frame, an icon and three texts, grouped into an object.', 14),
        {
          id: 'rule',
          type: 'rect' as const,
          z: 'a4',
          center: { x: 0, y: 36 },
          size: { width: 264, height: 1 },
          style: { hue: 'neutral', fill: true, border: false },
        },
        text('footer', 'a5', [-132, 48, 264, 24], 'composite · six parts', 12),
      ] satisfies Node[]
    ).map((node) => [node.id, node]),
  ),
};

const instanceOf = (
  id: string,
  z: string,
  [x, y]: [number, number],
  overrides?: InstanceNode['overrides'],
): InstanceNode => ({
  type: 'instance',
  id,
  z,
  center: { x, y },
  size: CARD_SIZE,
  composite: 'card',
  ...(overrides ? { overrides } : {}),
});

const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      instanceOf('plain', 'b0', [-168, 0]),
      // One instance overriding parts of the definition: a blue glyph and two of its texts.
      instanceOf('toned', 'b1', [168, 0], {
        icon: { style: { hue: 'blue' } },
        title: { label: 'Overridden' },
        footer: { label: 'composite · one override' },
      }),
    ].map((node) => [node.id, node]),
  ),
};

const COMPOSITE: Scene.SceneDocument = fromRenderLists2D([BOARD, CARD], { root: 'board' });

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const CompositeStory = () => (
  <SceneEditorStory document={COMPOSITE} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'ui/react-ui-canvas-editor/components/Cards',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

export const Default: StoryObj = {};

/** The same card built from primitives: its parts are in the Views tree, and an instance overrides any of them. */
export const Composite: StoryObj = { render: CompositeStory };
