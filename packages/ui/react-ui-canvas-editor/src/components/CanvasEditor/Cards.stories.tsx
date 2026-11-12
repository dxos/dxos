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

import { type IconNode, type RenderList2D, fromRenderLists2D } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type InstanceNode, type Node, type NoteNode, type Scene } from '@dxos/scene';

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
// The same card as a composite object: a scene marked `kind: 'composite'`, placed by `instance` nodes. The document
// is written through `fromRenderLists2D` rather than by hand, because an instance names its definition through a
// model `Object2D` (`parts`), not a field of its own — writing the element by hand silently makes a node that is not
// an instance, with no parts to expand.
//
// Its parts are placed from `CardFrame`'s own box model, measured off the rendered kind, so the two stories are the
// same picture and a different model — which is the point. The title, body and footer are `note` nodes (the text
// type) and the hairline is a `line` link between two free points, rather than rectangles standing in for both.
//

/**
 * `CardFrame`'s box model in scene px. The card pads to the minor cell measured from its own edge, and every region
 * is a whole number of half cells: a three-cell header set by its glyph, the body between, and a two-cell footer of
 * the hairline, half a cell and its line.
 */
const CELL = 12;
const PAD = CELL;
const GAP = CELL / 2;
const GLYPH = CELL * 3;
/** One line at 16px and at 12px, each rounded up to a whole number of half cells. */
const TITLE_LINE = CELL * 2;
const FOOTER_LINE = CELL * 1.5;
const FOOTER = CELL * 2;

const LEFT = -CARD_SIZE.width / 2 + PAD;
const RIGHT = CARD_SIZE.width / 2 - PAD;
const TOP = -CARD_SIZE.height / 2 + PAD;
const BOTTOM = CARD_SIZE.height / 2 - PAD;
/** The footer sits on the bottom padding (`mt-auto`), with the hairline on the top of its own block. */
const RULE_Y = BOTTOM - FOOTER;

/** A text node of the card, its frame the box its text fills: a card's regions start on their own edge, not a grid
 * cell inside it, so each takes no padding. */
const text = (
  id: string,
  z: string,
  [x, y, width, height]: [number, number, number, number],
  value: string,
  fontSize: number,
): NoteNode => ({
  id,
  type: 'note',
  z,
  center: { x: x + width / 2, y: y + height / 2 },
  size: { width, height },
  text: value,
  padding: { x: 0, y: 0 },
  style: { alignHorizontal: 'left', alignVertical: 'top', fontSize },
});

const glyph = (id: string, z: string, center: { x: number; y: number }, type: string): IconNode => ({
  id,
  type: 'icon',
  z,
  center,
  size: { width: GLYPH, height: GLYPH },
  icon: { type },
});

/** The definition: the card's frame, its glyph, its three texts and the hairline over the footer. */
const CARD: RenderList2D = {
  id: 'card',
  name: 'Card',
  kind: 'composite',
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
        glyph('icon', 'a1', { x: LEFT + GLYPH / 2, y: TOP + GLYPH / 2 }, 'command'),
        // The title's line is centred in the taller row its glyph sets.
        text(
          'title',
          'a2',
          [LEFT + GLYPH + GAP, TOP + (GLYPH - TITLE_LINE) / 2, RIGHT - LEFT - GLYPH - GAP, TITLE_LINE],
          'Composite',
          16,
        ),
        // The body takes what the header and the footer leave, as the kind's does.
        text(
          'body',
          'a3',
          [LEFT, TOP + GLYPH + GAP, RIGHT - LEFT, BOTTOM - FOOTER - GAP - (TOP + GLYPH + GAP)],
          'A frame, a glyph, three texts and a line, grouped into an object.',
          14,
        ),
        text(
          'footer',
          'a4',
          [LEFT, BOTTOM - FOOTER_LINE, RIGHT - LEFT, FOOTER_LINE],
          'composite · five shapes and a line',
          12,
        ),
      ] satisfies Node[]
    ).map((node) => [node.id, node]),
  ),
  // The hairline the footer sits under: a line between two free points, so it is a line rather than a 1px shape.
  links: {
    rule: {
      id: 'rule',
      type: 'line',
      z: 'b0',
      source: { point: { x: LEFT, y: RULE_Y } },
      target: { point: { x: RIGHT, y: RULE_Y } },
      style: { hue: 'neutral' },
    },
  },
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
      instanceOf('plain', 'b0', [-192, 0]),
      // One instance overriding parts of the definition: a blue glyph and two of its texts.
      instanceOf('toned', 'b1', [192, 0], {
        icon: { style: { hue: 'blue' } },
        title: { text: 'Overridden' },
        footer: { text: 'composite · one override' },
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
