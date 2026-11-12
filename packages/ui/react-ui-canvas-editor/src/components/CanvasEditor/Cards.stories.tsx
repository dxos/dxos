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

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

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
// The same card as a composite object: a scene marked `kind: 'composite'`, placed by `instance` nodes.
//

const CARD: Scene.Element2D[] = [
  {
    id: 'frame',
    type: 'rect',
    z: 'a0',
    center: { x: 0, y: 0 },
    size: { width: 288, height: 168 },
    props: { canvas: { style: { rounded: true } } },
  },
  {
    id: 'icon',
    type: 'icon',
    z: 'a1',
    center: { x: -120, y: -60 },
    size: { width: 24, height: 24 },
    props: { canvas: { icon: { type: 'command' } } },
  },
  {
    id: 'title',
    type: 'rect',
    z: 'a2',
    center: { x: -6, y: -60 },
    size: { width: 180, height: 24 },
    props: {
      canvas: {
        label: 'Composite',
        style: { fill: false, border: false, alignHorizontal: 'left', fontSize: 18 },
      },
    },
  },
  {
    id: 'body',
    type: 'note',
    z: 'a3',
    center: { x: 0, y: 0 },
    size: { width: 240, height: 48 },
    props: { canvas: { text: 'A frame, an icon and three texts, grouped into an object.', style: { fontSize: 14 } } },
  },
  {
    id: 'footer',
    type: 'rect',
    z: 'a4',
    center: { x: 0, y: 48 },
    size: { width: 240, height: 24 },
    props: {
      canvas: {
        label: 'composite · five parts',
        style: { fill: false, border: false, alignHorizontal: 'left', fontSize: 12 },
      },
    },
  },
];

const instanceOf = (id: string, z: string, [x, y]: [number, number], overrides?: object): Scene.Element2D => ({
  id,
  type: 'instance',
  z,
  center: { x, y },
  size: { width: 288, height: 168 },
  props: { canvas: { composite: 'card', ...(overrides ? { overrides } : {}) } },
});

const COMPOSITE: Scene.SceneDocument = {
  scenes: [{ id: 'root', dim: '2d', layout: 'board', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'board',
      dim: '2d',
      name: 'Board',
      elements: Object.fromEntries(
        [
          instanceOf('plain', 'b0', [-168, 0]),
          // One instance overriding parts of the definition: a blue glyph and its own title.
          instanceOf('toned', 'b1', [168, 0], {
            icon: { style: { hue: 'blue' } },
            title: { label: 'Overridden' },
            footer: { label: 'composite · one override' },
          }),
        ].map((element) => [element.id, element]),
      ),
    },
    {
      id: 'card',
      dim: '2d',
      name: 'Card',
      kind: 'composite',
      elements: Object.fromEntries(CARD.map((element) => [element.id, element])),
    },
  ],
  models: [],
};

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
