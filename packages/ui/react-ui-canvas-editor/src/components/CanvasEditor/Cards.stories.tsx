//
// Copyright 2026 DXOS.org
//

//
// The `card` and `icon` types in the editor: both are built-ins, so they are in the palette beside the rect and the
// ellipse, and this is where to drag one out and look at it. A card is a header of a glyph and a title, a body, and
// a footer under a hairline, each edited in place; an icon is the glyph alone, at any of Phosphor's six weights.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

type Regions = { label?: string; body?: string; footer?: string };

const cardOf = (id: string, z: string, [x, y]: [number, number], icon: string, regions: Regions): Scene.Element2D => ({
  id,
  type: 'card',
  z,
  center: { x, y },
  size: { width: 288, height: 160 },
  props: { canvas: { icon: { name: icon }, ...regions } },
});

const iconOf = (id: string, z: string, [x, y]: [number, number], weight: string): Scene.Element2D => ({
  id,
  type: 'icon',
  z,
  center: { x, y },
  size: { width: 96, height: 96 },
  props: { canvas: { icon: { name: 'command', weight }, label: weight } },
});

/** Which regions a card may carry, and one glyph at four of its weights. */
const DOCUMENT: Scene.SceneDocument = (() => {
  const elements: Scene.Element2D[] = [
    cardOf('full', 'a0', [-336, -112], 'command', {
      label: 'Every region',
      body: 'A header of a glyph and a title, this body, and a footer under a hairline.',
      footer: 'card · all three',
    }),
    cardOf('header', 'a1', [0, -112], 'rocket', { label: 'Header only' }),
    cardOf('footer', 'a2', [336, -112], 'anchor', { label: 'No body', footer: 'card · header and footer' }),
    iconOf('thin', 'a3', [-336, 112], 'thin'),
    iconOf('regular', 'a4', [-112, 112], 'regular'),
    iconOf('bold', 'a5', [112, 112], 'bold'),
    iconOf('fill', 'a6', [336, 112], 'fill'),
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

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} docked>
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
