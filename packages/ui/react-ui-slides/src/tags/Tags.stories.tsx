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
  title: 'ui/react-ui-slides/tags/Tags',
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

/** One icon card: a Phosphor glyph named by `icon`, a title, and the bullets under it. */
const iconCard = (attributes: string, title: string, ...bullets: string[]) =>
  [`<Card ${attributes}>`, '', `### ${title}`, '', ...bullets.map((bullet) => `- ${bullet}`), '', '</Card>'].join('\n');

/** Three icon cards whose titles wrap differently: one line, then two, then two with a bullet more. */
const ICON_CARDS = [
  iconCard('icon="brain" tone="warning"', 'Shared Memory', 'Beyond silos', 'One graph for people and agents'),
  iconCard('icon="shield-check"', 'Access and Authorization', 'Delegation', 'Policy and auditing'),
  iconCard(
    'icon="users-three" tone="success"',
    'Coordination and Collaboration',
    'Rethinking the User Interface',
    'Agents as peers',
    'Shared context',
  ),
];

/** The titles of a row's cards end on one line however each wraps, so the first bullets of the row are level. */
const expectLevelBodies = async (cards: HTMLElement[]) => {
  const headers = await Promise.all(cards.map((card) => query(card, 'header')));
  const titles = await Promise.all(cards.map((card) => query(card, 'header h3')));
  const first = await Promise.all(cards.map((card) => query(card, 'li')));
  // The story is only a test of this while the titles do wrap differently.
  const lines = titles.map((title) => {
    const style = getComputedStyle(title);
    return Math.round(parseFloat(style.height) / parseFloat(style.lineHeight));
  });
  await expect(lines).toEqual([1, 2, 2]);
  for (const index of [1, 2]) {
    await expect(headers[index].getBoundingClientRect().height).toBeCloseTo(
      headers[0].getBoundingClientRect().height,
      0,
    );
    await expect(first[index].getBoundingClientRect().top).toBeCloseTo(first[0].getBoundingClientRect().top, 0);
  }
};

/**
 * A row of cards with an icon in place of art: `icon` names a Phosphor glyph, which stands with the title as one
 * header and takes the card's `tone`, and the bullets are sized for the card and set under the title. The cards of a
 * row share one header height, so their bullets start level under titles of one line and of two. The deck's font here
 * is Space Grotesk, whose widths are not the default mono's.
 */
export const IconCards: Story = {
  render: (props: MarkdownSlideProps) => (
    <SlideThemeProvider settings={{ font: 'space-grotesk' }}>
      <TestContainer {...props} />
    </SlideThemeProvider>
  ),
  args: {
    content: slide({ layout: 'default' }, '# Problems', '', '<Grid cols="3">', '', ...ICON_CARDS, '', '</Grid>'),
  },
  play: async ({ canvasElement }) => {
    await query(canvasElement, 'article[data-icon] header svg');
    const cards = [...canvasElement.querySelectorAll('article')];
    const rects = cards.map((card) => card.getBoundingClientRect());

    // 1. Three cards of one size, whatever each holds: the third has a longer title and a bullet more.
    await expect(cards).toHaveLength(3);
    for (const rect of rects.slice(1)) {
      await expect(rect.width).toBeCloseTo(rects[0].width, 0);
      await expect(rect.height).toBeCloseTo(rects[0].height, 0);
      await expect(rect.top).toBeCloseTo(rects[0].top, 0);
    }

    // 2. Each card's icon and title are one header: the glyph the card names, then the title beside it.
    const headers = await Promise.all(
      cards.map(async (card) => ({
        card,
        icon: await query(card, 'header svg'),
        title: await query(card, 'header h3'),
      })),
    );
    await expect(headers.map(({ icon }) => icon.getAttribute('data-icon'))).toEqual([
      'ph--brain--regular',
      'ph--shield-check--regular',
      'ph--users-three--regular',
    ]);
    for (const { icon, title } of headers) {
      // The icon is one title line tall and stands on the title's first line, at the card's padding.
      await expect(getComputedStyle(title).fontSize).toBe('56px');
      await expect(getComputedStyle(icon).height).toBe(getComputedStyle(title).lineHeight);
      await expect(icon.getBoundingClientRect().top).toBeCloseTo(title.getBoundingClientRect().top, 0);
      await expect(icon.getBoundingClientRect().right).toBeLessThan(title.getBoundingClientRect().left);
    }

    // 3. The icon takes the card's tone; a card with none keeps the deck's accent.
    await expect(cards.map((card) => card.dataset.tone)).toEqual(['warning', undefined, 'success']);
    await expect(new Set(headers.map(({ icon }) => getComputedStyle(icon).color)).size).toBe(3);

    // 4. The bullets are the card's own: its list size rather than the slide's, each marker drawn inside the card
    // under the icon, and the text starting where the title does.
    for (const { card, icon, title } of headers) {
      const items = [...card.querySelectorAll('li')];
      await expect(items.length).toBeGreaterThanOrEqual(2);
      for (const item of items) {
        const style = getComputedStyle(item);
        const marker = getComputedStyle(item, '::before');
        const box = item.getBoundingClientRect();
        // The slide is scaled to fit the story, so a computed length is converted to the screen's pixels.
        const scale = box.width / item.offsetWidth;
        await expect(style.fontSize).toBe('40px');
        await expect(marker.content).toBe('"•"');
        await expect(marker.textAlign).toBe('center');
        await expect(box.left).toBeCloseTo(icon.getBoundingClientRect().left, 0);
        await expect(parseFloat(marker.width) * scale).toBeCloseTo(icon.getBoundingClientRect().width, 0);
        await expect(box.left + parseFloat(style.paddingLeft) * scale).toBeCloseTo(
          title.getBoundingClientRect().left,
          0,
        );
        await expect(box.right).toBeLessThanOrEqual(card.getBoundingClientRect().right);
      }
    }

    // 5. A one-line title beside two-line titles: every header is as tall as the tallest, and the bullets start level.
    await expectLevelBodies(cards);
  },
};

/**
 * `<Grid align>` gives a grid the height of what it holds and places it in the space left to it, here in the middle
 * of the slide under its title; without it a grid fills that space, as in the story above. The cards of the row still
 * share one height, the tallest card's.
 */
export const GridAlign: Story = {
  render: IconCards.render,
  args: {
    content: slide(
      { layout: 'default' },
      '# Problems',
      '',
      '<Grid cols="3" align="center">',
      '',
      ...ICON_CARDS,
      '',
      '</Grid>',
    ),
  },
  play: async ({ canvasElement }) => {
    const grid = await query(canvasElement, '[data-align="center"]');
    const slot = await query(canvasElement, '[data-slot="default"]');
    const heading = await query(canvasElement, '[data-slide] h1');
    await query(canvasElement, 'article[data-icon] header svg');
    const cards = [...canvasElement.querySelectorAll('article')];
    const rects = cards.map((card) => card.getBoundingClientRect());

    // 1. The grid is as tall as its cards, which is less than the space under the title.
    const space = slot.getBoundingClientRect().bottom - heading.getBoundingClientRect().bottom;
    await expect(grid.getBoundingClientRect().height).toBeCloseTo(rects[0].height, 0);
    await expect(grid.getBoundingClientRect().height).toBeLessThan(space / 2);

    // 2. It stands in the middle of that space: the room over it and under it is the same.
    const style = getComputedStyle(grid);
    await expect(parseFloat(style.marginTop)).toBeGreaterThan(0);
    await expect(parseFloat(style.marginTop)).toBeCloseTo(parseFloat(style.marginBottom), 0);
    await expect(grid.getBoundingClientRect().bottom).toBeLessThan(slot.getBoundingClientRect().bottom);

    // 3. The three cards are one height, the tallest's, and their bullets still start level.
    for (const rect of rects.slice(1)) {
      await expect(rect.height).toBeCloseTo(rects[0].height, 0);
      await expect(rect.top).toBeCloseTo(rects[0].top, 0);
    }
    await expectLevelBodies(cards);
  },
};

/**
 * Icon cards beside something that is not a card. Every child of the grid takes a whole row, so the box stands beside
 * the first card at its height, and the two cards after it start a row of their own with their headers level.
 */
export const IconCardsBesideBox: Story = {
  render: IconCards.render,
  args: {
    content: slide(
      { layout: 'default' },
      '<Grid cols="2" align="center">',
      '',
      iconCard('icon="brain"', 'One', 'First'),
      '<Box variant="card">',
      '',
      'A box, directly in the grid.',
      '',
      '</Box>',
      iconCard('icon="shield-check"', 'Two', 'Second'),
      iconCard('icon="users-three"', 'Three, with a title long enough to wrap onto a second line', 'Third'),
      '',
      '</Grid>',
    ),
  },
  play: async ({ canvasElement }) => {
    await query(canvasElement, 'article[data-icon] header svg');
    const box = await query(canvasElement, 'div[data-variant="card"]');
    const [one, two, three] = [...canvasElement.querySelectorAll('article')];

    // 1. The box covers the whole of the first row, as the card beside it does.
    await expect(box.getBoundingClientRect().top).toBeCloseTo(one.getBoundingClientRect().top, 0);
    await expect(box.getBoundingClientRect().height).toBeCloseTo(one.getBoundingClientRect().height, 0);

    // 2. The next two cards share the second row: one top, one header height, and bullets that start level.
    await expect(two.getBoundingClientRect().top).toBeGreaterThan(one.getBoundingClientRect().bottom);
    await expect(three.getBoundingClientRect().top).toBeCloseTo(two.getBoundingClientRect().top, 0);
    const [short, long] = await Promise.all([query(two, 'header'), query(three, 'header')]);
    await expect(short.getBoundingClientRect().height).toBeCloseTo(long.getBoundingClientRect().height, 0);
    const [second, third] = await Promise.all([query(two, 'li'), query(three, 'li')]);
    await expect(third.getBoundingClientRect().top).toBeCloseTo(second.getBoundingClientRect().top, 0);
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
 * A deck's theme colors each heading level apart from the accent. The deck here sets only the second level: the
 * first still follows the accent, and inside a toned box it follows the tone, while the second keeps its own color.
 */
export const HeadingColors: Story = {
  render: (props: MarkdownSlideProps) => (
    <SlideThemeProvider settings={{ accent: '#2d6fff', subheading: '#336288' }}>
      <TestContainer {...props} />
    </SlideThemeProvider>
  ),
  args: {
    content: slide(
      { layout: 'default' },
      '# Follows the accent',
      '',
      '## Takes the subheading color',
      '',
      '### As does a third level',
      '',
      '<Box variant="outline" tone="warning">',
      '',
      '# Follows the tone',
      '',
      '## Keeps the subheading color',
      '',
      '</Box>',
    ),
  },
  play: async ({ canvasElement }) => {
    const color = async (selector: string) => getComputedStyle(await query(canvasElement, selector)).color;
    await expect(await color('[data-slide] h1')).toBe('rgb(45, 111, 255)');
    await expect(await color('[data-slide] h2')).toBe('rgb(51, 98, 136)');
    await expect(await color('[data-slide] h3')).toBe('rgb(51, 98, 136)');

    // Unset, the first level reads the accent where it stands, which the box has rebound to its tone.
    const box = await query(canvasElement, 'div[data-tone="warning"]');
    await expect(await color('div[data-tone="warning"] h1')).toBe(getComputedStyle(box).borderTopColor);
    await expect(await color('div[data-tone="warning"] h1')).not.toBe('rgb(45, 111, 255)');
    await expect(await color('div[data-tone="warning"] h2')).toBe('rgb(51, 98, 136)');
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

    // The arrow's box is the gap between two cards, with the glyph in the middle of it: an arrow hung off the
    // card's edge sat against the next card.
    const arrow = getComputedStyle(items[0], '::after');
    await expect(parseFloat(arrow.width)).toBeCloseTo(parseFloat(getComputedStyle(flow).columnGap), 0);
    await expect(arrow.textAlign).toBe('center');

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
