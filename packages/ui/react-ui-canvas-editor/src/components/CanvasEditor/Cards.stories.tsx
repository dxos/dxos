//
// Copyright 2026 DXOS.org
//

//
// The `card` and `icon` types in the editor: both are built-ins, so they are in the palette beside the rect and the
// ellipse, and this is where to drag one out and look at it. A card is a header of a glyph and a title, a body, and
// a footer under a hairline, each edited in place; an icon is the glyph alone, at any of Phosphor's six weights.
//
// `Composite` draws the same card the other way: a composite object of primitives — a frame, a glyph, three text
// nodes and the hairline as a line — placed by `instance` nodes. The two stories are the same picture and a
// different model, which is the point: the Views inspector expands an instance into its parts, and an instance
// overrides any field of any part (`overrides`, merged per key for `style`), so one card's glyph is blue without a
// `tone` property existing anywhere.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type RenderList2D, compileTemplate, fromRenderLists2D, isCompiled } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type InstanceNode, type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

type Regions = { label?: string; body?: string; footer?: string };

/**
 * Both stories are laid out on the grid: every size is a whole number of nominal units (one unit is the major cell,
 * 48px) and every centre is half a size off a major line, so each shape's own edges land on the heavy lines rather
 * than between them.
 */
const CARD_SIZE = { width: 288, height: 192 };
const ICON_SIZE = { width: 96, height: 96 };

const cardOf = (id: string, z: string, [x, y]: [number, number], icon: string, regions: Regions): Scene.Element2D => ({
  id,
  type: 'card',
  z,
  center: { x, y },
  size: CARD_SIZE,
  props: { canvas: { icon: { type: icon }, ...regions } },
});

const iconOf = (id: string, z: string, [x, y]: [number, number], weight: string): Scene.Element2D => ({
  id,
  type: 'icon',
  z,
  center: { x, y },
  size: ICON_SIZE,
  props: { canvas: { icon: { type: 'command', weight }, label: weight } },
});

/** Which regions a card may carry, and one glyph at four of its weights. */
const DOCUMENT: Scene.SceneDocument = (() => {
  const elements: Scene.Element2D[] = [
    cardOf('full', 'a0', [-336, -144], 'command', {
      label: 'Every region',
      body: 'A header of a glyph and a title, this body, and a footer under a hairline.',
      footer: 'card · all three',
    }),
    cardOf('header', 'a1', [0, -144], 'rocket', { label: 'Header only' }),
    cardOf('footer', 'a2', [336, -144], 'anchor', { label: 'No body', footer: 'card · header and footer' }),
    iconOf('thin', 'a3', [-336, 96], 'thin'),
    iconOf('regular', 'a4', [-144, 96], 'regular'),
    iconOf('bold', 'a5', [144, 96], 'bold'),
    iconOf('fill', 'a6', [336, 96], 'fill'),
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
// The same card as a composite object, written the way a tool ships one: a `composite` statement in the scene DSL,
// compiled once and placed by instances. Every part says how it follows the frame (`constrain`), so the third card —
// the same Object at half again the height — keeps its glyph in the corner, its footer on the floor and grows its
// body, rather than scaling like a picture. The two stories are the same card and a different model, which is the
// point: an instance's parts are in the Views tree, are edited in place, and any field of any part can be overridden
// for one instance alone.
//

/**
 * The card's box model, in scene px: it pads to the minor cell, its header is the three cells its glyph sets, and
 * its footer two. Written out as DSL rather than built as nodes, because that is what a tool contributes.
 */
const CELL = 12;
const PAD = CELL;
const GLYPH = CELL * 3;
const FOOTER = CELL * 1.5;
const LEFT = -CARD_SIZE.width / 2 + PAD;
const TOP = -CARD_SIZE.height / 2 + PAD;
const RIGHT = CARD_SIZE.width / 2 - PAD;
const BOTTOM = CARD_SIZE.height / 2 - PAD;
const BODY_TOP = TOP + GLYPH + CELL / 2;
const BODY_BOTTOM = BOTTOM - FOOTER - CELL / 2;

const round = (value: number) => Math.round(value * 100) / 100;

const CARD_TEMPLATE = `composite cardObject size=${CARD_SIZE.width}x${CARD_SIZE.height} name="Card" {
  element frame rect @ 0,0 size=${CARD_SIZE.width}x${CARD_SIZE.height} constrain=stretch rounded=true
  element icon icon @ ${round(LEFT + GLYPH / 2)},${round(TOP + GLYPH / 2)} size=${GLYPH}x${GLYPH} constrain=min icon=command
  element title note "Composite" @ ${round((LEFT + GLYPH + CELL / 2 + RIGHT) / 2)},${round(TOP + GLYPH / 2)} size=${round(RIGHT - LEFT - GLYPH - CELL / 2)}x${CELL * 2} constrain=stretch,min
  element body note "A frame, a glyph and three texts, grouped into an object." @ 0,${round((BODY_TOP + BODY_BOTTOM) / 2)} size=${round(RIGHT - LEFT)}x${round(BODY_BOTTOM - BODY_TOP)} constrain=stretch
  element footer note "composite · five parts" @ 0,${round(BOTTOM - FOOTER / 2)} size=${round(RIGHT - LEFT)}x${FOOTER} constrain=stretch,max
}
`;

const COMPOSITE_ID = 'card-object';

const compiled = compileTemplate(CARD_TEMPLATE, COMPOSITE_ID);
if (!isCompiled(compiled)) {
  throw new Error(`The card template does not compile: ${compiled.problems.join(' ')}`);
}
const CARD: RenderList2D = compiled.composite;

const instanceOf = (
  id: string,
  z: string,
  [x, y]: [number, number],
  size: { width: number; height: number } = CARD_SIZE,
  overrides?: InstanceNode['overrides'],
): InstanceNode => ({
  type: 'instance',
  id,
  z,
  center: { x, y },
  size,
  composite: COMPOSITE_ID,
  // The parts fill the frame by their constraints, so the Object is drawn at the size it is given.
  fit: 'none',
  ...(overrides ? { overrides } : {}),
});

const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      instanceOf('plain', 'b0', [-384, 0]),
      // One instance overriding parts of the definition: a blue glyph and two of its texts.
      instanceOf('toned', 'b1', [0, 0], CARD_SIZE, {
        icon: { style: { hue: 'blue' } },
        title: { text: 'Overridden' },
        footer: { text: 'composite · one override' },
      }),
      // The same Object, taller and wider: its glyph stays in the corner and its footer on the floor.
      instanceOf(
        'stretched',
        'b2',
        [396, 48],
        { width: 384, height: 288 },
        {
          title: { text: 'Constrained' },
          body: {
            text: 'The same object at another size: the glyph keeps the corner, the footer the floor, and the body takes what is left.',
          },
          footer: { text: 'composite · constrained parts' },
        },
      ),
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
