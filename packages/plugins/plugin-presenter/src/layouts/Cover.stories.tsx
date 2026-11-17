//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentType } from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SlideThemeProvider } from '../components/SlideTheme/index.ts';
import { query, slide } from '../testing/slideStory.tsx';
import { TestContainer, type TestContainerProps } from '../testing/TestContainer.tsx';

/**
 * Title slides, as a set to choose between. Each draws the brand's own lockup — the mark with `DXOS` under it in the
 * brand face — rather than setting the name as a heading, and each places the deck's title differently around it.
 */
const meta = {
  title: 'plugins/plugin-presenter/layouts/Cover',
  component: TestContainer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TestContainer>;

export default meta;

type Story = StoryObj<TestContainerProps>;

const BRAND = 'https://assets.dxos.org/brand';
/** The vertical lockup: the mark over the wordmark, both centred, so the mark sits on the slide's axis. */
const LOCKUP = `${BRAND}/logotypes/dxos-hero-white.svg`;
/** The wordmark alone, for a slide whose mark is drawn by the art behind it. */
const WORDMARK = `${BRAND}/logotypes/dxos-text-white.svg`;
/** The deck's own art: the mark drawn as a lit volume, exported from the Figma title slide. */
const GLOW = `${BRAND}/backgrounds/dxos-glow.svg`;

const hero = (source: string) => ['<Box variant="hero">', '', `![DXOS](${source})`, '', '</Box>'];

/** 1. The lockup on the slide's axis, with the deck's title and date beneath it. */
export const Stacked: Story = {
  args: {
    content: slide(
      { layout: 'center' },
      ...hero(LOCKUP),
      '',
      '## The decentralized operating system',
      '',
      '*November 2026*',
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="center"]');
    const mark = frame.querySelector('img')!;
    // 1. The lockup is drawn, so the name is set in the brand face rather than as a heading.
    await waitFor(() => expect(mark.naturalWidth).toBeGreaterThan(0));
    await expect(frame.querySelectorAll('h1')).toHaveLength(0);
    // 2. The mark sits on the slide's horizontal axis.
    const art = mark.getBoundingClientRect();
    const slideBox = frame.getBoundingClientRect();
    const offset = Math.abs((art.left + art.width / 2 - slideBox.left) / slideBox.width - 0.5);
    await expect(offset).toBeLessThan(0.02);
  },
};

/** 2. The subject above the lockup as an eyebrow, the date below: the lockup reads as the middle of a sentence. */
export const Eyebrow: Story = {
  args: {
    content: slide(
      { layout: 'center' },
      '*Realtime graph database, decentralized identity, agents*',
      '',
      ...hero(LOCKUP),
      '',
      '## November 2026',
    ),
  },
};

/** 3. The brand's own art draws the mark; the title holds the top edge and the wordmark the bottom, leaving it the middle. */
export const Art: Story = {
  args: {
    content: slide(
      {
        layout: 'center',
        background: `${BRAND}/backgrounds/dxos-center.svg`,
        // The art's mark is centred, so it is held down to where it reads as texture between the words rather than
        // as a second mark competing with the wordmark.
        backgroundOpacity: 0.22,
      },
      '<Box variant="spread">',
      '',
      '## The decentralized operating system',
      '',
      `![DXOS](${WORDMARK})`,
      '',
      '</Box>',
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="center"]');
    const heading = frame.querySelector('h2')!.getBoundingClientRect();
    const mark = frame.querySelector('[data-variant="spread"] img')!;
    await waitFor(() => expect((mark as HTMLImageElement).naturalWidth).toBeGreaterThan(0));
    // The two blocks hold opposite edges, so the art has the slide's middle to itself.
    const slideBox = frame.getBoundingClientRect();
    await expect(heading.top - slideBox.top).toBeLessThan(slideBox.height / 4);
    await expect(slideBox.bottom - mark.getBoundingClientRect().bottom).toBeLessThan(slideBox.height / 4);
  },
};

/** 4. The lockup holds one half and the words the other, each centred in its own column. */
export const Split: Story = {
  args: {
    content: slide(
      { layout: 'two-cols' },
      ...hero(LOCKUP),
      '',
      '::right::',
      '',
      '# The decentralized operating system',
      '',
      '*November 2026*',
    ),
  },
};

/** The deck's own face: Poiret One, the thin geometric display the Figma slide sets its name in. */
const display = (Story: ComponentType) => (
  <SlideThemeProvider settings={{ font: 'display' }}>
    <Story />
  </SlideThemeProvider>
);

/**
 * 6. The deck's own title slide, reproduced from the Figma deck it was designed in: the artwork is that slide
 * exported as SVG and published to the brand bucket, and the words sit at its own measurements rather than in the
 * layout's padding.
 */
/**
 * The title slide on a named ground. The art carries its own black, so `screen` composites that away and
 * `backgroundColor` is what shows behind the glow: the slide's color becomes a value rather than a decision baked
 * into an SVG. The deck's green is the accent, which the links take.
 */
const glowSlide = (backgroundColor: string) =>
  slide(
    {
      layout: 'cover',
      accent: 'rgb(31,213,138)',
      background: GLOW,
      backgroundColor,
      backgroundBlend: 'screen',
    },
    '<Box variant="title">',
    '',
    '# composer',
    '',
    // Two trailing spaces: the links are one block set on two lines, not two paragraphs the box would space apart.
    '[https://dxos.org/composer](https://dxos.org/composer)  ',
    '[https://dxos.org/xxx (video)](https://dxos.org/xxx)',
    '',
    '</Box>',
    '',
    '<Box variant="caption">',
    '',
    `![DXOS](${BRAND}/logotypes/dxos-horizontal-white.svg)`,
    '',
    'DXOS.org',
    '',
    '</Box>',
  );

export const Glow: Story = {
  decorators: [display],
  // Black is what the art was drawn on, so the slide is unchanged by taking its color this way.
  args: { content: glowSlide('#000000') },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="cover"]');
    const lockup = frame.querySelector('[data-variant="caption"] img')!;
    // 1. The brand lockup is drawn.
    await waitFor(() => expect((lockup as HTMLImageElement).naturalWidth).toBeGreaterThan(0));
    // 2. The title and the lockup share the slide's start edge, so the two blocks read as one column.
    const title = frame.querySelector('h1')!.getBoundingClientRect();
    await expect(Math.abs(title.left - lockup.getBoundingClientRect().left)).toBeLessThan(2);
    // 3. The slide's own color is what shows behind the art, rather than the black the art carries.
    const background = await query(canvasElement, '[data-slide-background] > div');
    const style = getComputedStyle(background);
    await expect(style.backgroundColor).toBe('rgb(0, 0, 0)');
    await expect(style.backgroundBlendMode).toBe('screen');
  },
};

/**
 * 7. The same slide on a different ground. Nothing about the artwork changes: `screen` drops the black it was drawn
 * on, so the glow lands on whatever `backgroundColor` names.
 */
export const GlowTinted: Story = {
  decorators: [display],
  args: { content: glowSlide('#0b1f17') },
  play: async ({ canvasElement }) => {
    const background = await query(canvasElement, '[data-slide-background] > div');
    const style = getComputedStyle(background);
    await expect(style.backgroundColor).toBe('rgb(11, 31, 23)');
    await expect(style.backgroundBlendMode).toBe('screen');
  },
};

/** 4. The art fills a column of its own, bleeding to the slide's edges, with the words in the column beside it. */
export const Column: Story = {
  args: {
    content: slide(
      // The art carries its own ground (`rgb(29,31,32)`, the brand's fallback fill), so the slide takes the same one
      // and the column's edge does not show as a seam.
      { layout: 'two-cols', bleed: 'left', background: 'rgb(29,31,32)' },
      '<Box variant="fill">',
      '',
      `![](${BRAND}/backgrounds/dxos-center.svg)`,
      '',
      '</Box>',
      '',
      '::right::',
      '',
      '<Box variant="lockup">',
      '',
      `![DXOS](${WORDMARK})`,
      '',
      '</Box>',
      '',
      '## The decentralized operating system',
      '',
      '*November 2026*',
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="two-cols"]');
    // The box the art fills, not the `<img>` itself: the picture is a renamed bucket key, which `brand-assets.yml`
    // publishes only once this lands on main, so it does not load here and an unloaded image has no size of its
    // own. The box is laid out either way, and the layout is what the story is about.
    const fill = frame.querySelector('[data-variant="fill"]')!;
    await expect(fill.querySelector('img')?.getAttribute('src')).toContain('/backgrounds/dxos-center.svg');
    // 1. The art's column runs to the slide's own top and bottom edges rather than sitting inside the padding.
    const picture = fill.getBoundingClientRect();
    const slideBox = frame.getBoundingClientRect();
    await expect(Math.abs(picture.top - slideBox.top)).toBeLessThan(2);
    await expect(Math.abs(picture.bottom - slideBox.bottom)).toBeLessThan(2);
    // What is not asserted: that the art runs past its column's sides, which the slide's own edge then crops. That
    // comes from the picture's intrinsic size, and the picture does not load until its key is published; restore it
    // once `brand-assets.yml` has run on main.
    // 2. The words beside it are laid out as though it were not there.
    const words = frame.querySelector('[data-variant="lockup"] img')!.getBoundingClientRect();
    await expect(words.left).toBeGreaterThan(slideBox.left + slideBox.width / 2);
  },
};
