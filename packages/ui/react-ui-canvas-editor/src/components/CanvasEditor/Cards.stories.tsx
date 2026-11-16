//
// Copyright 2026 DXOS.org
//

//
// The `card` and `icon` types in the editor: both are built-ins, so they are in the palette beside the rect and the
// ellipse, and this is where to drag one out and look at it.
//
// A card is a composite object, not a shape a view paints: the tool ships its template in the scene DSL
// (`card-template.ts`), the canvas places an Instance of it, and each region — the glyph, the title, the body, the
// hairline and the footer — is a part of its own. So every card here expands in the Views tree, each part is
// selected, moved, restyled and edited in place, and the regions a card may do without are switched off per card in
// the Properties panel rather than by leaving a field unset. An icon is the glyph alone, at any of Phosphor's six
// weights, and stays a primitive: a single glyph has no parts to compose.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import {
  CARD_TEMPLATE,
  type CardNode,
  type IconNode,
  type IconWeight,
  type RenderList2D,
  compileTemplate,
  fromRenderLists2D,
  isCompiled,
} from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type PlacedComposite, type Scene } from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

/**
 * Everything is laid out on the grid: every size is a whole number of nominal units (one unit is the major cell,
 * 48px) and every centre is half a size off a major line, so each shape's own edges land on the heavy lines rather
 * than between them.
 */
const CARD_SIZE = { width: 288, height: 192 };
const ICON_SIZE = { width: 96, height: 96 };

/** The id the `card` tool stores its one definition under; every card in a drawing is an Instance of it. */
const COMPOSITE = 'template:card';

const compiled = compileTemplate(CARD_TEMPLATE, COMPOSITE);
if (!isCompiled(compiled)) {
  throw new Error(`The card template does not compile: ${compiled.problems.join(' ')}`);
}
const CARD: RenderList2D = compiled.composite;

/** A card as the tool makes one: its own typed fields, and the Instance fields that place the Object. */
type Card = CardNode & Pick<PlacedComposite, 'composite' | 'overrides'>;

type CardFields = {
  icon?: string;
  label?: string;
  body?: string;
  footer?: string;
  /** The optional parts this card turns off, as the Properties panel's switches write them. */
  without?: readonly ('icon' | 'body' | 'footer')[];
};

const cardOf = (
  id: string,
  z: string,
  [x, y]: [number, number],
  { icon, label, body, footer, without = [] }: CardFields,
  size = CARD_SIZE,
): Card => {
  const overrides = Object.fromEntries(without.map((part) => [part, { hidden: true }]));
  return {
    type: 'card',
    id,
    z,
    center: { x, y },
    size,
    // Every card draws the tool's one Object; its own fields fill the bound parts.
    composite: COMPOSITE,
    ...(icon ? { icon: { type: icon } } : {}),
    ...(label ? { label } : {}),
    ...(body ? { body } : {}),
    ...(footer ? { footer } : {}),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  };
};

const iconOf = (id: string, z: string, [x, y]: [number, number], weight: IconWeight): IconNode => ({
  id,
  type: 'icon',
  z,
  center: { x, y },
  size: ICON_SIZE,
  icon: { type: 'command', weight },
  label: weight,
});

/**
 * Which regions a card may carry and what each part does when the frame changes, then one glyph at four weights.
 * The fourth card is the same Object at half again the size: its glyph keeps the corner, its footer the floor, and
 * its body takes what is left — a card reflows rather than scaling like a picture.
 */
const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      cardOf('full', 'a0', [-384, -144], {
        icon: 'command',
        label: 'Every region',
        body: 'A header of a glyph and a title, this body, and a footer under a hairline.',
        footer: 'card · all three',
      }),
      cardOf('header', 'a1', [-48, -144], { icon: 'rocket', label: 'Header only', without: ['body', 'footer'] }),
      cardOf('footer', 'a2', [288, -144], {
        icon: 'anchor',
        label: 'No body',
        footer: 'card · header and footer',
        without: ['body'],
      }),
      cardOf(
        'resized',
        'a3',
        [648, -96],
        {
          icon: 'crown',
          label: 'Constrained',
          body: 'The same object at another size: the glyph keeps the corner, the footer the floor, and the body takes what is left.',
          footer: 'card · constrained parts',
        },
        { width: 384, height: 288 },
      ),
      cardOf('bare', 'a4', [-384, 96], {
        label: 'No glyph',
        body: 'Its glyph is switched off, so the title takes the corner it stood in.',
        footer: 'card · title widened',
        without: ['icon'],
      }),
      iconOf('thin', 'b0', [48, 144], 'thin'),
      iconOf('regular', 'b1', [240, 144], 'regular'),
      iconOf('bold', 'b2', [432, 144], 'bold'),
      iconOf('fill', 'b3', [624, 144], 'fill'),
    ].map((node) => [node.id, node]),
  ),
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD, CARD], { root: 'board' });

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

/** Every card is an Instance of the tool's one Object: expand one in the Views tree to see its parts. */
export const Default: StoryObj = {};
