//
// Copyright 2026 DXOS.org
//

//
// The canvas's card in the shared editor: one composite Object (`CARD_TEMPLATE`) whose glyph, title, body, hairline
// and footer are parts on the grid. The first card is the size the tool draws one at, where each part stands as the
// template writes it; the second is the same Object resized, so its parts follow their constraints.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import {
  CARD_SIZE,
  CARD_TEMPLATE,
  type CardNode,
  type RenderList2D,
  compileTemplate,
  fromRenderLists2D,
  isCompiled,
  templateCompositeId,
} from '@dxos/react-ui-canvas';
import { FullEditor, SceneEditorStory } from '@dxos/react-ui-canvas-editor/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type PlacedComposite, type Scene } from '@dxos/scene';

/** The id the `card` tool stores its one definition under; every card in a drawing is an Instance of it. */
const COMPOSITE = templateCompositeId('card');

const compiled = compileTemplate(CARD_TEMPLATE, COMPOSITE);
if (!isCompiled(compiled)) {
  throw new Error(`The card template does not compile: ${compiled.problems.join(' ')}`);
}

/** A card as the tool makes one: its own typed fields, and the Instance fields that place the Object. */
type Card = CardNode & Pick<PlacedComposite, 'composite'>;

const card = (id: string, x: number, size: { width: number; height: number }, body: string): Card => ({
  type: 'card',
  id,
  z: `a${id}`,
  // The top edges line up, on a major grid line.
  center: { x, y: size.height / 2 - CARD_SIZE.height / 2 },
  size,
  composite: COMPOSITE,
  icon: { type: 'command' },
  label: 'The Card',
  body,
  footer: 'Footer',
});

const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      card('authored', -144, CARD_SIZE, 'The body is here.'),
      card(
        'resized',
        192,
        { width: CARD_SIZE.width * 1.5, height: CARD_SIZE.height * 1.5 },
        'The same card, larger: the glyph keeps its corner, the footer its floor, and the body takes what is left.',
      ),
    ].map((node) => [node.id, node]),
  ),
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD, compiled.composite], { root: 'board' });

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'plugins/plugin-canvas/components/Card',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 1. Both cards draw their title, body and footer.
 * 2. Each text part is drawn at its own size: the title 18 px, the body 16, the footer 14.
 * 3. The glyph is 24 px, the size of the two cells it stands in.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The card as drawn, not its rows in the Views tree, which name the same text.
    const drawn = async (id: string) => {
      await canvas.findAllByText('The Card', undefined, { timeout: 30_000 });
      const node = canvasElement.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
      if (!node) {
        throw new Error(`The card ${id} is not drawn.`);
      }
      return node;
    };
    const authored = within(await drawn('authored'));
    const resized = within(await drawn('resized'));
    await expect(resized.getByText('Footer')).toBeVisible();

    const fontSize = (text: string) => Number.parseFloat(getComputedStyle(authored.getByText(text)).fontSize);
    await expect([fontSize('The Card'), fontSize('The body is here.'), fontSize('Footer')]).toEqual([18, 16, 14]);

    const glyph = (await drawn('authored')).querySelector('[data-part="icon"] svg');
    await expect(glyph).not.toBeNull();
    await expect([glyph?.clientWidth, glyph?.clientHeight]).toEqual([24, 24]);
  },
};
