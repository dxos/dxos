//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { query, slide } from '../../testing/slideStory.tsx';
import { SlideWorkbench, type SlideWorkbenchProps } from '../../testing/SlideWorkbench.tsx';
import { SUITE } from '../../testing/suiteArt.ts';

/**
 * The layout tags — `<Grid>`, `<Cell>` and `<Card>` — which lay a slide out in tracks rather than down the page.
 * Every story shows the slide over a live editor holding the markdown that renders it, so a span or a variant can be
 * changed and seen without leaving the story.
 */
const meta = {
  title: 'plugins/plugin-presenter/components/LayoutTags',
  component: SlideWorkbench,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SlideWorkbench>;

export default meta;

type Story = StoryObj<SlideWorkbenchProps>;

/** One suite card: the topic's art, its name and its sentence. ECHO leads the grid and takes two columns. */
const card = (index: number) => {
  const topic = SUITE[index];
  return [
    `<Card${topic.colSpan > 1 ? ` colSpan="${topic.colSpan}"` : ''}>`,
    '',
    `![${topic.label}](${topic.image})`,
    '',
    `### ${topic.label}`,
    '',
    topic.description,
    '',
    '</Card>',
  ].join('\n');
};

/**
 * The suite as the docs home lays it out: four columns over two rows, with ECHO two wide, so seven cards fill
 * eight cells.
 */
export const SuiteGrid: Story = {
  args: {
    content: slide(
      { layout: 'default' },
      '<Grid cols="4" rows="2">',
      '',
      ...SUITE.map((_, index) => card(index)),
      '',
      '</Grid>',
    ),
  },
  play: async ({ canvasElement }) => {
    const grid = await query(canvasElement, '[data-variant] > article');
    const cards = canvasElement.querySelectorAll('article');
    // 1. Every topic gets a card, each with its art, its title and its sentence.
    await expect(cards).toHaveLength(SUITE.length);
    await expect(cards[0].querySelector('h3')?.textContent).toBe('ECHO');
    await expect(cards[0].querySelector('img')?.getAttribute('src')).toBe(SUITE[0].image);
    await expect(cards[0].textContent).toContain('context memory');
    // 2. ECHO spans two of the four columns; the rest take one.
    await expect(grid.getAttribute('style')).toContain('--slide-col-span: 2');
    await expect(cards[1].getAttribute('style') ?? '').not.toContain('--slide-col-span');
  },
};

/**
 * A title slide: the brand's DXOS mark centred, with the deck's title under it. The `center` layout centres its slot,
 * so the mark is content rather than a background and the title never crosses it.
 */
export const Cover: Story = {
  args: {
    content: slide(
      { layout: 'center' },
      '![DXOS](https://assets.dxos.org/brand/icons/white/icon-dxos.svg)',
      '',
      '# DXOS',
      '',
      '## The decentralized operating system',
    ),
  },
  play: async ({ canvasElement }) => {
    const slide = await query(canvasElement, '[data-layout="center"]');
    const mark = slide.querySelector('img');
    // 1. The mark is drawn, and it is the brand's white one so it reads on the dark slide.
    await expect(mark?.getAttribute('src')).toContain('/brand/icons/white/icon-dxos.svg');
    await waitFor(() => expect(mark?.naturalWidth).toBeGreaterThan(0));
    // 2. The title sits under the mark, not across it.
    await expect(slide.querySelector('h1')?.textContent).toBe('DXOS');
    const art = mark!.getBoundingClientRect();
    const title = slide.querySelector('h1')!.getBoundingClientRect();
    await expect(title.top).toBeGreaterThanOrEqual(art.bottom - 1);
  },
};

/** The grid alone, holding cells rather than cards: the spans, with nothing drawn in them but their own numbers. */
export const CellSpans: Story = {
  args: {
    content: slide(
      { layout: 'default' },
      '<Grid cols="3" rows="2">',
      '',
      '<Cell colSpan="2">',
      '',
      '<Box variant="card">',
      '',
      'Two columns',
      '',
      '</Box>',
      '',
      '</Cell>',
      '',
      '<Cell rowSpan="2">',
      '',
      '<Box variant="outline">',
      '',
      'Two rows',
      '',
      '</Box>',
      '',
      '</Cell>',
      '',
      '<Cell>',
      '',
      '<Box variant="card">',
      '',
      'One cell',
      '',
      '</Box>',
      '',
      '</Cell>',
      '',
      '</Grid>',
    ),
  },
  play: async ({ canvasElement }) => {
    const grid = await query(canvasElement, '[data-variant="default"]');
    // 1. The grid lays down the three columns and two rows it was asked for.
    await expect(grid.getAttribute('style')).toContain('--slide-grid-cols: 3');
    await expect(grid.getAttribute('style')).toContain('--slide-grid-rows: 2');
    // 2. Each cell spans what it asked for, and a bare cell asks for nothing.
    const cells = grid.querySelectorAll(':scope > div');
    await expect(cells[0].getAttribute('style')).toContain('--slide-col-span: 2');
    await expect(cells[1].getAttribute('style')).toContain('--slide-row-span: 2');
    await expect(cells[2].getAttribute('style') ?? '').not.toContain('-span');
  },
};

/** The three card styles side by side. */
export const CardVariants: Story = {
  args: {
    content: slide(
      { layout: 'default' },
      '<Grid cols="3">',
      '',
      ...['default', 'outline', 'plain'].map((variant) =>
        [
          `<Card variant="${variant}">`,
          '',
          `![${variant}](${SUITE[0].image})`,
          '',
          `### ${variant}`,
          '',
          'A card holds art, a title and a line or two.',
          '',
          '</Card>',
        ].join('\n'),
      ),
      '',
      '</Grid>',
    ),
  },
};
