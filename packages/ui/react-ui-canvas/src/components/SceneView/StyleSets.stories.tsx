//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { createMemoryStore } from '../../model/store.ts';
import { BACKGROUND_IDS, STYLE_SET_IDS } from '../../model/style-set.ts';
import { SceneBuilder } from '../../utils/builder.ts';
import { SceneView } from './SceneView.tsx';

const cell = (x: number, y: number, width = 4, height = 2) => ({
  x: x * 64,
  y: y * 64,
  width: width * 64,
  height: height * 64,
});

/** One of each element: plain and hued rectangles at several tones, an ellipse, a note, a frame and links between them. */
const createSample = () =>
  SceneBuilder.scene('root', [
    SceneBuilder.rect('plain', cell(0, 0)).properties({ label: 'Plain' }),
    SceneBuilder.rect('blue', cell(6, 0)).properties({ label: 'Blue', style: { hue: 'blue' } }),
    SceneBuilder.rect('strong', cell(12, 0)).properties({ label: 'Strong', style: { hue: 'violet', tone: 1 } }),
    SceneBuilder.ellipse('ellipse', cell(0, 4, 4, 3)).properties({ label: 'Ellipse', style: { hue: 'teal' } }),
    SceneBuilder.rect('rounded', cell(6, 4)).properties({
      label: 'Rounded',
      style: { hue: 'amber', rounded: true },
    }),
    SceneBuilder.rect('outline', cell(12, 4)).properties({
      label: 'Outline tone',
      style: { hue: 'red', tone: 0, lineStyle: 'dashed' },
    }),
    SceneBuilder.note('note', cell(0, 8, 5, 2)).properties({ text: 'A note says what the diagram does not.' }),
    SceneBuilder.scene('child', [
      SceneBuilder.rect('inner-a', cell(0, 0)).properties({ label: 'Inside', style: { hue: 'green' } }),
      SceneBuilder.rect('inner-b', cell(6, 0)).properties({ label: 'Frame', style: { hue: 'sky' } }),
      SceneBuilder.link('smart', 'inner-a', 'inner-b').id('inner-link'),
    ])
      .name('Child')
      .at(cell(7, 8, 9, 4))
      .properties({ label: 'Frame' }),
    SceneBuilder.link('smart', 'plain', 'blue').id('l1'),
    SceneBuilder.link('smart', 'blue', 'strong')
      .id('l2')
      .properties({ style: { hue: 'violet' }, ends: { end: 'arrow' } }),
    SceneBuilder.link('smart', 'ellipse', 'rounded')
      .id('l3')
      .properties({ style: { hue: 'teal' }, text: 'flows' }),
    SceneBuilder.link('smart', 'rounded', 'outline')
      .id('l4')
      .properties({ style: { hue: 'red', lineStyle: 'dashed' } }),
  ]).build();

type StoryArgs = { styleSet: string; background?: string };

const StyleSetView = ({ styleSet, background }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = createSample();
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, []);
  return (
    <SceneView.Root store={store} root={root} styleSet={styleSet} background={background} inspectors='floating'>
      <SceneView.Canvas />
      <SceneView.Navigation />
      <SceneView.Actions />
    </SceneView.Root>
  );
};

/**
 * Style sets restyle every element; a background is chosen apart from the set, which names its own default.
 *
 * Test:
 * 1. Each story draws the same scene: rectangles at several tones, an ellipse, a note, a frame and links.
 * 2. Pick another `styleSet`: every node, link and caption changes; classic is the canvas as it always looked.
 * 3. Pick a `background`: the grid, washes, fill and grain change and the elements keep their set.
 */
const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/StyleSets',
  render: (args) => <StyleSetView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
  args: { styleSet: 'classic' },
  argTypes: {
    styleSet: { control: 'inline-radio', options: STYLE_SET_IDS },
    background: { control: 'inline-radio', options: [undefined, ...BACKGROUND_IDS] },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Classic: Story = {};

export const Flat: Story = { args: { styleSet: 'flat' } };

export const Outline: Story = { args: { styleSet: 'outline' } };

export const Glass: Story = { args: { styleSet: 'glass' } };

/** Glass on warm paper: the light background picks the set's light tokens. */
export const GlassOnPaper: Story = { args: { styleSet: 'glass', background: 'paper' } };
