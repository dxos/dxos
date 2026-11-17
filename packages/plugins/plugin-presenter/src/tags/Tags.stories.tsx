//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MarkdownSlide, type MarkdownSlideProps } from '../components/MarkdownSlide/index.ts';
import { SlideThemeProvider } from '../components/SlideTheme/index.ts';
import { query, slide } from '../testing/slideStory.tsx';
import { SUITE } from '../testing/suiteArt.ts';
import { TestContainer } from '../testing/TestContainer.tsx';

/**
 * The tags the slide DSL adds to markdown, and what each one is for: `<Grid>`, `<Cell>` and `<Card>` lay a slide out
 * in tracks, while `<List>`, `<Table>` and `<Box>` name a variant for the block they wrap. Every story shows the
 * slide over a live editor holding the markdown that renders it, so a span, a variant or a tone can be changed and
 * seen without leaving the story.
 */
const meta = {
  title: 'plugins/plugin-presenter/tags/Tags',
  component: MarkdownSlide,
  render: TestContainer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarkdownSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

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

/** `<List variant>` styles a markdown list without changing what it is: numbered cards beside outlined claims. */
export const ListVariants: Story = {
  args: {
    content: slide(
      { layout: 'two-cols-header' },
      '# Three technologies, two claims',
      '',
      '::left::',
      '',
      "#### What we'll show you",
      '',
      '<List variant="steps">',
      '',
      '1. ECHO',
      '2. Agents',
      '3. Composer',
      '',
      '</List>',
      '',
      '::right::',
      '',
      '#### What we claim',
      '',
      '<List variant="outline">',
      '',
      '- Category-leading apps can replace the current generation of SaaS',
      '- Composer can become the leading agent harness, beating Cowork, across models',
      '',
      '</List>',
    ),
  },
  play: async ({ canvasElement }) => {
    const steps = await query(canvasElement, '[data-slot="left"] ol[data-variant="steps"]');
    await expect(steps.querySelectorAll('li')).toHaveLength(3);
    const outline = await query(canvasElement, '[data-slot="right"] ul[data-variant="outline"]');
    await expect(outline.textContent).toContain('agent harness');
  },
};

/** Every list variant, on the plain list each one restyles. */
export const ListVariantGallery: Story = {
  args: {
    content: slide(
      { layout: 'three-cols' },
      '#### Cards',
      '',
      '<List variant="cards">',
      '',
      '- ECHO',
      '- Agents',
      '',
      '</List>',
      '',
      '::middle::',
      '',
      '#### Steps',
      '',
      '<List variant="steps">',
      '',
      '1. **ECHO** holds the data',
      '   - replicated',
      '   - local-first',
      '2. Agents',
      '',
      '</List>',
      '',
      '::right::',
      '',
      '#### Outline',
      '',
      '<List variant="outline">',
      '',
      '- ECHO',
      '- Agents',
      '',
      '</List>',
    ),
  },
  play: async ({ canvasElement }) => {
    await query(canvasElement, '[data-variant="cards"]');
    const steps = await query(canvasElement, '[data-variant="steps"]');
    await query(canvasElement, '[data-variant="outline"]');

    // The counter is drawn beside the content, so a step's own markdown stays in one flow: a flex item would
    // have made `**ECHO**` a box of its own, separated from the rest of the sentence by the row's gap.
    const [item] = steps.querySelectorAll('li');
    await expect(getComputedStyle(item).display).toBe('list-item');
    await expect(getComputedStyle(item, '::before').position).toBe('absolute');

    // A nested list is block content under the step's text, not a column beside it, and takes the plain list
    // classes rather than the step's: only the list the tag wrapped carries the variant.
    const nested = item.querySelector('ul')!;
    await expect(nested.dataset.variant).toBeUndefined();
    await expect(nested.getBoundingClientRect().top).toBeGreaterThan(item.getBoundingClientRect().top);
    await expect(nested.getBoundingClientRect().width).toBeGreaterThan(item.getBoundingClientRect().width / 2);
  },
};

/** `<Table variant>` styles a GFM table the same way `<List>` styles a list. */
export const TableVariants: Story = {
  args: {
    content: slide(
      { layout: 'two-cols-header' },
      '# Where the work runs',
      '',
      '::left::',
      '',
      '#### Rows',
      '',
      '<Table variant="rows">',
      '',
      '| Layer | Runs on |',
      '| --- | --- |',
      '| ECHO | The device |',
      '| Agents | The device or EDGE |',
      '| Composer | The browser |',
      '',
      '</Table>',
      '',
      '::right::',
      '',
      '#### Cards',
      '',
      '<Table variant="cards">',
      '',
      '| Layer | Runs on |',
      '| --- | --- |',
      '| ECHO | The device |',
      '| Agents | The device or EDGE |',
      '| Composer | The browser |',
      '',
      '</Table>',
    ),
  },
  play: async ({ canvasElement }) => {
    const rows = await query(canvasElement, '[data-slot="left"] table[data-variant="rows"]');
    await expect(rows.querySelectorAll('tbody tr')).toHaveLength(3);
    await query(canvasElement, '[data-slot="right"] table[data-variant="cards"]');
  },
};

/** `<Box variant>` is the generic container: it wraps whatever it holds, including a styled list. */
export const BoxVariants: Story = {
  args: {
    content: slide(
      { layout: 'two-cols-header' },
      '# Two claims',
      '',
      '::left::',
      '',
      '<Box variant="card">',
      '',
      '### Today',
      '',
      'Category-leading apps can replace the current generation of SaaS.',
      '',
      '</Box>',
      '',
      '::right::',
      '',
      '<Box variant="outline">',
      '',
      '### Next',
      '',
      '<List variant="steps">',
      '',
      '1. Beat Cowork',
      '2. Across models',
      '',
      '</List>',
      '',
      '</Box>',
    ),
  },
  play: async ({ canvasElement }) => {
    const card = await query(canvasElement, '[data-slot="left"] div[data-variant="card"]');
    await expect(card.textContent).toContain('Today');
    const outline = await query(canvasElement, '[data-slot="right"] div[data-variant="outline"]');
    await expect(outline.querySelector('ol[data-variant="steps"]')).not.toBeNull();
  },
};

/**
 * The three ways a deck repaints a variant: the deck's theme (the `SlideThemeProvider` around the story), the slide's
 * own frontmatter, and a `tone` on one block.
 */
export const ThemeOverrides: Story = {
  render: (props: MarkdownSlideProps) => (
    <SlideThemeProvider settings={{ code: '#15202b', separator: '#2b3a4a' }}>
      <TestContainer {...props} />
    </SlideThemeProvider>
  ),
  args: {
    content: slide(
      { layout: 'two-cols-header', accent: '#ff7a1a' },
      '# Overrides',
      '',
      '::left::',
      '',
      "#### The slide's accent",
      '',
      '<List variant="steps">',
      '',
      '1. ECHO',
      '2. Agents',
      '',
      '</List>',
      '',
      '::right::',
      '',
      '#### One block, another tone',
      '',
      '<Box variant="outline" tone="info">',
      '',
      'Replaces the accent for this box only.',
      '',
      '<List variant="outline" tone="accent">',
      '',
      "- Back to the slide's accent",
      '',
      '</List>',
      '',
      '</Box>',
    ),
  },
  play: async ({ canvasElement }) => {
    const steps = await query(canvasElement, 'ol[data-variant="steps"]');
    await expect(getComputedStyle(steps).getPropertyValue('--slide-accent').trim()).toBe('#ff7a1a');
    const box = await query(canvasElement, 'div[data-tone="info"]');
    await expect(getComputedStyle(box).getPropertyValue('--slide-accent').trim()).not.toBe('#ff7a1a');

    // `tone="accent"` inside a toned box returns to the slide's accent instead of inheriting the box's.
    const nested = await query(canvasElement, 'ul[data-tone="accent"]');
    await expect(getComputedStyle(nested).getPropertyValue('--slide-accent').trim()).toBe('#ff7a1a');
  },
};

/**
 * `<List variant="flow">` lays the items out as a row of cards with an arrow in each gap, and `active` marks the
 * one the story has reached. The item's own markdown names its parts: emphasis is the label, strong is the title.
 */
export const FlowVariant: Story = {
  args: {
    content: slide(
      { layout: 'default' },
      '# How we got here',
      '',
      '<List variant="flow" active="4">',
      '',
      '1. **Chat** A model in a separate window',
      '2. **Vibe coding** Describe it and the model builds it',
      '3. *Now* **Cowork** Claude working inside your existing apps',
      '4. *Next* **Replacing apps** The assistant becomes the app',
      '',
      '</List>',
    ),
  },
  play: async ({ canvasElement }) => {
    const flow = await query(canvasElement, 'ol[data-variant="flow"]');
    const items = [...flow.querySelectorAll('li')];
    await expect(items).toHaveLength(4);

    // The cards share the row, so each one's top edge is the same and the last carries no arrow.
    await expect(getComputedStyle(flow).gridAutoFlow).toContain('column');
    await expect(items[3].getBoundingClientRect().top).toBeCloseTo(items[0].getBoundingClientRect().top, 0);
    await expect(getComputedStyle(items[0], '::after').content).toBe('"→"');
    await expect(getComputedStyle(items[3], '::after').content).toBe('none');

    // `active` marks the fourth item, and only it.
    await expect(items.filter((item) => item.dataset.active !== undefined)).toEqual([items[3]]);
  },
};

/** The row composes with `<v-clicks>`, so a build reveals the cards one at a time. */
export const FlowBuild: Story = {
  args: {
    step: 2,
    content: slide(
      { layout: 'default' },
      '# How we got here',
      '',
      '<v-clicks>',
      '',
      '<List variant="flow" active="4">',
      '',
      '1. **Chat** A model in a separate window',
      '2. **Vibe coding** Describe it and the model builds it',
      '3. *Now* **Cowork** Claude working inside your existing apps',
      '4. *Next* **Replacing apps** The assistant becomes the app',
      '',
      '</List>',
      '',
      '</v-clicks>',
    ),
  },
  play: async ({ canvasElement }) => {
    const flow = await query(canvasElement, 'ol[data-variant="flow"]');
    const items = [...flow.querySelectorAll('li')];
    // Two cards are out; the rest hold their place in the row so the layout never shifts as the build runs.
    await expect(items.map((item) => item.classList.contains('invisible'))).toEqual([false, false, true, true]);
    await expect(items[3].getBoundingClientRect().top).toBeCloseTo(items[0].getBoundingClientRect().top, 0);

    // The arrow between the two revealed cards is drawn; the one that would point at a card still to come is not.
    await expect(getComputedStyle(items[0], '::after').content).toBe('"→"');
    await expect(getComputedStyle(items[1], '::after').content).toBe('none');

    // Clicking the slide runs the build on, and the arrow that was waiting is drawn with the card it points at.
    await userEvent.click(items[0]);
    await waitFor(() => expect(items[2].classList.contains('invisible')).toBe(false));
    await expect(getComputedStyle(items[1], '::after').content).toBe('"→"');
  },
};
