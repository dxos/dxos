//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { query, slide } from '../../testing/slideStory.tsx';
import { SlideWorkbench, type SlideWorkbenchProps } from '../../testing/SlideWorkbench.tsx';

/**
 * Title slides, as a set to choose between. Each draws the brand's own lockup — the mark with `DXOS` under it in the
 * brand face — rather than setting the name as a heading, and each places the deck's title differently around it.
 */
const meta = {
  title: 'plugins/plugin-presenter/components/Cover',
  component: SlideWorkbench,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SlideWorkbench>;

export default meta;

type Story = StoryObj<SlideWorkbenchProps>;

const BRAND = 'https://assets.dxos.org/brand';
/** The vertical lockup: the mark over the wordmark, both centred, so the mark sits on the slide's axis. */
const LOCKUP = `${BRAND}/logotypes/dxos-hero-white.svg`;
/** The wordmark alone, for a slide whose mark is drawn by the art behind it. */
const WORDMARK = `${BRAND}/logotypes/dxos-text-white.svg`;
/** The deck's own art: the mark drawn as a lit volume, exported from the Figma title slide. */
const GLOW = `${BRAND}/backgrounds/bg-dxos-glow.svg`;

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
        background: `${BRAND}/backgrounds/bg-dxos.svg`,
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

/**
 * 6. The deck's own title slide, reproduced from the Figma deck it was designed in: the artwork is that slide
 * exported as SVG and published to the brand bucket, and the words sit at its own measurements rather than in the
 * layout's padding.
 */
export const Glow: Story = {
  args: {
    content: slide(
      // The art carries the slide's background, black included, so the frontmatter names no color of its own; the
      // deck's green is the accent, which the links take.
      { layout: 'cover', accent: 'rgb(31,213,138)', background: GLOW },
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
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="cover"]');
    const lockup = frame.querySelector('[data-variant="caption"] img')!;
    // 1. The brand lockup is drawn.
    await waitFor(() => expect((lockup as HTMLImageElement).naturalWidth).toBeGreaterThan(0));
    // 2. The title and the lockup share the slide's start edge, so the two blocks read as one column.
    const title = frame.querySelector('h1')!.getBoundingClientRect();
    await expect(Math.abs(title.left - lockup.getBoundingClientRect().left)).toBeLessThan(2);
  },
};

/** 4. The art fills a column of its own, bleeding to the slide's edges, with the words in the column beside it. */
export const Column: Story = {
  args: {
    content: slide(
      { layout: 'two-cols', bleed: 'left' },
      '<Box variant="fill">',
      '',
      `![](${BRAND}/backgrounds/bg-dxos.svg)`,
      '',
      '</Box>',
      '',
      '::right::',
      '',
      '# DXOS',
      '',
      '## The decentralized operating system',
      '',
      '*November 2026*',
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = await query(canvasElement, '[data-layout="two-cols"]');
    const art = frame.querySelector('[data-variant="fill"] img')!;
    await waitFor(() => expect((art as HTMLImageElement).naturalWidth).toBeGreaterThan(0));
    // 1. The art runs to the slide's own start and bottom edges rather than sitting inside the layout's padding.
    const picture = art.getBoundingClientRect();
    const slideBox = frame.getBoundingClientRect();
    await expect(Math.abs(picture.left - slideBox.left)).toBeLessThan(2);
    await expect(Math.abs(picture.bottom - slideBox.bottom)).toBeLessThan(2);
    // 2. It keeps to its own column, so the words beside it are clear of it.
    await expect(picture.right).toBeLessThan(slideBox.left + slideBox.width / 2);
  },
};
