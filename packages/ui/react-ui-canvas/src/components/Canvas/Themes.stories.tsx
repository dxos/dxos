//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ViewBuilder } from '../../builder/index.ts';
import { type BackgroundGrid, THEME_IDS, createMemoryStore } from '../../model/index.ts';
import { Canvas } from './Canvas.tsx';

const cell = (x: number, y: number, width = 4, height = 2) => ({
  x: x * 64,
  y: y * 64,
  width: width * 64,
  height: height * 64,
});

/** One of each element: plain and hued rectangles at several tones, an ellipse, a note, a frame and links between them. */
const createSample = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('plain', cell(0, 0)).properties({ label: 'Plain' }),
    ViewBuilder.rect('blue', cell(6, 0)).properties({ label: 'Blue', style: { hue: 'blue' } }),
    ViewBuilder.rect('strong', cell(12, 0)).properties({ label: 'Strong', style: { hue: 'violet', tone: 1 } }),
    // A circle, centred on its row.
    ViewBuilder.ellipse('ellipse', cell(0.5, 3.5, 3, 3)).properties({ label: 'Ellipse', style: { hue: 'teal' } }),
    ViewBuilder.rect('rounded', cell(6, 4)).properties({
      label: 'Rounded',
      style: { hue: 'amber', rounded: true },
    }),
    ViewBuilder.rect('outline', cell(12, 4)).properties({
      label: 'Outline tone',
      style: { hue: 'red', tone: 0, lineStyle: 'dashed' },
    }),
    ViewBuilder.note('note', cell(0, 8, 5, 2)).properties({ text: 'A note says what the diagram does not.' }),
    ViewBuilder.view('child', [
      ViewBuilder.rect('inner-a', cell(0, 0)).properties({ label: 'Inside', style: { hue: 'green' } }),
      ViewBuilder.rect('inner-b', cell(6, 0)).properties({ label: 'Frame', style: { hue: 'sky' } }),
      ViewBuilder.link('smart', 'inner-a', 'inner-b').id('inner-link'),
    ])
      .name('Child')
      .at(cell(7, 8, 9, 4))
      .properties({ label: 'Frame' }),
    ViewBuilder.link('smart', 'plain', 'blue').id('l1'),
    ViewBuilder.link('smart', 'blue', 'strong')
      .id('l2')
      .properties({ style: { hue: 'violet' }, ends: { end: 'arrow' } }),
    ViewBuilder.link('smart', 'ellipse', 'rounded')
      .id('l3')
      .properties({ style: { hue: 'teal' }, text: 'flows' }),
    ViewBuilder.link('smart', 'rounded', 'outline')
      .id('l4')
      .properties({ style: { hue: 'red', lineStyle: 'dashed' } }),
  ]).build();

/** Each tone side by side, as boxes and as outline shapes, joined by links with each kind of end. */
const createTones = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('inset', cell(0, 0)).properties({ label: 'Inset (tone 0)', style: { hue: 'blue', tone: 0 } }),
    ViewBuilder.rect('flat', cell(6, 0)).properties({ label: 'Flat (tone 1)', style: { hue: 'blue', tone: 1 } }),
    ViewBuilder.rect('blue', cell(12, 0)).properties({ label: 'Raised (tone 2)', style: { hue: 'blue', tone: 2 } }),
    ViewBuilder.polygon('polygon-inset', cell(0, 4, 4, 3)).properties({
      label: 'Inset',
      style: { hue: 'teal', tone: 0 },
    }),
    ViewBuilder.cloud('cloud-flat', cell(6, 4, 4, 3)).properties({ label: 'Flat', style: { hue: 'teal', tone: 1 } }),
    ViewBuilder.polygon('polygon-raised', cell(12, 4, 4, 3)).properties({ label: 'Raised', style: { hue: 'teal' } }),
    ViewBuilder.cloud('cloud-inset', cell(0, 9, 4, 3)).properties({
      label: 'Inset',
      style: { hue: 'violet', tone: 0 },
    }),
    ViewBuilder.cloud('cloud-raised', cell(12, 9, 4, 3)).properties({ label: 'Raised', style: { hue: 'violet' } }),
    ViewBuilder.link('smart', 'inset', 'flat')
      .id('arrow')
      .properties({ ends: { end: 'arrow' } }),
    ViewBuilder.link('smart', 'flat', 'blue')
      .id('triangle')
      .properties({ ends: { end: 'triangle' } }),
    ViewBuilder.link('smart', 'blue', 'polygon-raised')
      .id('circle')
      .properties({ ends: { start: 'circle', end: 'arrow' } }),
    ViewBuilder.link('smart', 'polygon-inset', 'cloud-inset')
      .id('down')
      .properties({ style: { hue: 'teal' }, ends: { end: 'arrow' } }),
    ViewBuilder.link('smart', 'cloud-inset', 'cloud-raised')
      .id('across')
      .properties({ style: { lineStyle: 'dashed' }, ends: { start: 'triangle', end: 'arrow' } }),
  ]).build();

type StoryArgs = { theme?: string; defaultTheme?: string; sample?: 'elements' | 'tones' };

const ThemeView = ({ theme: initialTheme, defaultTheme, sample = 'elements' }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = sample === 'tones' ? createTones() : createSample();
    return { store: createMemoryStore(tree.views), root: tree.root };
  }, [sample]);
  // The args are where the view starts; the theme bar changes it from there.
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);
  const [grid, setGrid] = useState<BackgroundGrid>();
  return (
    <Canvas.Root
      store={store}
      root={root}
      theme={theme}
      defaultTheme={defaultTheme}
      backgroundGrid={grid}
      onThemeChange={setTheme}
      onBackgroundGridChange={setGrid}
      inspectors='floating'
    >
      <Canvas.Viewport />
      <Canvas.Navigation />
      <Canvas.Actions />
      <Canvas.Camera />
      <Canvas.Display />
    </Canvas.Root>
  );
};

/**
 * A theme pairs a style set with a background, and may hold the canvas in light or dark whatever the app's mode.
 *
 * Test:
 * 1. Each story draws the same scene (SoftTones its own): rectangles at several tones, an ellipse, a note, a frame and
 *    links.
 * 2. The bar at the bottom right opens the theme list: each theme with a swatch, and a sun or moon when it has a mode;
 *    picking one restyles every element and the background; Default takes `defaultTheme`.
 * 3. The grid buttons draw dots, lines or no grid over the theme's background.
 */
const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/Themes',
  render: (args) => <ThemeView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    theme: { control: 'inline-radio', options: [undefined, ...THEME_IDS] },
    defaultTheme: { control: 'inline-radio', options: [undefined, ...THEME_IDS] },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** The default theme. */
export const Default: Story = {};

export const Glass: Story = { args: { theme: 'glass-night' } };

export const Plastic: Story = { args: { theme: 'night' } };

export const Paper: Story = { args: { theme: 'paper' } };

export const Flat: Story = { args: { theme: 'flat' } };

export const Outline: Story = { args: { theme: 'outline' } };

/** Neumorphism: shapes raised from a ground of their own tone, links as grooves; light or dark with the app. */
export const Soft: Story = { args: { theme: 'soft' } };

/** Soft held light whatever the app's mode. */
export const SoftLight: Story = { args: { theme: 'soft-light' } };

/**
 * The soft tones side by side, as boxes and as outline shapes: inset, flat and raised, raised the default. Links end in
 * an arrow, a triangle and a circle, each a head of the same groove as its track. Selecting a shape outlines it and
 * leaves its relief alone.
 */
export const SoftTones: Story = { args: { theme: 'soft', sample: 'tones' } };
