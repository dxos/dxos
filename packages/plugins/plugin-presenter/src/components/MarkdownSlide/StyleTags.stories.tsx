//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { query, slide } from '../../testing/slideStory.tsx';
import { SlideWorkbench } from '../../testing/SlideWorkbench.tsx';
import { SlideThemeProvider } from '../SlideTheme/index.ts';
import { MarkdownSlide, type MarkdownSlideProps } from './MarkdownSlide.tsx';

/**
 * The style tags — `<List>`, `<Table>` and `<Box>` — which name a variant for the block they wrap (or, for `<Box>`,
 * wrap their content in one). Every story shows the slide over a live editor holding the markdown that renders it,
 * so a variant can be changed and seen without leaving the story.
 */
const meta = {
  title: 'plugins/plugin-presenter/components/StyleTags',
  component: MarkdownSlide,
  render: SlideWorkbench,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarkdownSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

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
      <SlideWorkbench {...props} />
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
