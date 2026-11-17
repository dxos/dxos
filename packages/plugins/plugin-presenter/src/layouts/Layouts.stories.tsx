//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type LayoutName } from '#markdown';

import { MarkdownSlide, type MarkdownSlideProps } from '../components/MarkdownSlide/index.ts';
import { Slide } from '../components/Slide/index.ts';
import { query, slide } from '../testing/slideStory.tsx';

const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#2a6"/><stop offset="1" stop-color="#26a"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
)}`;

const DefaultStory = (props: MarkdownSlideProps) => (
  <Slide.Frame inset>
    <MarkdownSlide {...props} />
  </Slide.Frame>
);

/**
 * Every layout `layout:` names, one story each, in the order `LAYOUTS` declares them — the set a deck author chooses
 * from. Each shows the layout's own regions filled with the least content that makes them visible, so the stories
 * read as a catalogue; what a layout does with content beyond its regions belongs to the component's own stories.
 */
const meta = {
  title: 'plugins/plugin-presenter/layouts/Layouts',
  component: MarkdownSlide,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarkdownSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A story asserting that `selector` (scoped to the layout root) contains `text`. */
const layoutStory = (layout: LayoutName, content: string, selector: string, text: string): Story => ({
  args: { content },
  play: async ({ canvasElement }) => {
    const element = await query(canvasElement, `[data-layout="${layout}"] ${selector}`);
    await expect(element.textContent).toContain(text);
  },
});

const lead = ['# Slide title', '', 'Supporting text for the slide.'];

export const Default = layoutStory(
  'default',
  slide({ layout: 'default' }, ...lead),
  '[data-slot="default"] h1',
  'Slide title',
);

export const Cover = layoutStory(
  'cover',
  slide({ layout: 'cover', background: IMAGE, backgroundOpacity: 0.5 }, '# Presenter', '', 'Composer slides'),
  'h1',
  'Presenter',
);

export const Center = layoutStory('center', slide({ layout: 'center' }, '# Centered'), 'h1', 'Centered');

export const Section = layoutStory('section', slide({ layout: 'section' }, '# Part two'), 'h1', 'Part two');

export const Intro = layoutStory(
  'intro',
  slide({ layout: 'intro' }, '# Introduction', '', 'Speaker name, role'),
  'p',
  'Speaker name',
);

export const End = layoutStory('end', slide({ layout: 'end' }, '# Thank you'), 'h1', 'Thank you');

export const Fact = layoutStory(
  'fact',
  slide({ layout: 'fact' }, '# 100%', '', 'Of slides are markdown'),
  'h1',
  '100%',
);

export const Statement = layoutStory(
  'statement',
  slide({ layout: 'statement' }, '# Local-first by default'),
  'h1',
  'Local-first',
);

export const Quote = layoutStory(
  'quote',
  slide({ layout: 'quote' }, '> Simplicity is prerequisite for reliability.', '', 'Edsger Dijkstra'),
  'blockquote',
  'Simplicity',
);

export const TwoCols = layoutStory(
  'two-cols',
  slide({ layout: 'two-cols' }, '# Left', '', '- one', '- two', '', '::right::', '', '# Right', '', 'Right column'),
  '[data-slot="right"]',
  'Right column',
);

export const TwoColsHeader = layoutStory(
  'two-cols-header',
  slide(
    { layout: 'two-cols-header' },
    '# Header',
    '',
    '::left::',
    '',
    'Left column',
    '',
    '::right::',
    '',
    'Right column',
  ),
  '[data-slot="left"]',
  'Left column',
);

export const ThreeCols = layoutStory(
  'three-cols',
  slide(
    { layout: 'three-cols' },
    '# One',
    '',
    '- first',
    '',
    '::middle::',
    '',
    '# Two',
    '',
    '- second',
    '',
    '::right::',
    '',
    '# Three',
    '',
    'Third column',
  ),
  '[data-slot="right"]',
  'Third column',
);

export const TwoByTwo = layoutStory(
  'two-by-two',
  slide(
    { layout: 'two-by-two' },
    '# One',
    '',
    '::right::',
    '',
    '# Two',
    '',
    '::bottom-left::',
    '',
    '# Three',
    '',
    '::bottom-right::',
    '',
    '# Four',
    '',
    'Fourth region',
  ),
  '[data-slot="bottom-right"]',
  'Fourth region',
);

export const Image = layoutStory('image', slide({ layout: 'image', image: IMAGE }, '# Over image'), 'h1', 'Over image');

export const ImageLeft = layoutStory(
  'image-left',
  slide({ layout: 'image-left', image: IMAGE }, '# Image left', '', 'Content on the right.'),
  '[data-image] + [data-slot="default"]',
  'Content on the right',
);

export const ImageRight = layoutStory(
  'image-right',
  slide({ layout: 'image-right', image: IMAGE }, '# Image right', '', 'Content on the left.'),
  '[data-slot="default"]:has(+ [data-image])',
  'Content on the left',
);

export const Full = layoutStory(
  'full',
  slide({ layout: 'full' }, '# Full bleed'),
  '[data-slot="default"]',
  'Full bleed',
);

export const None = layoutStory('none', slide({ layout: 'none' }, '# Unstyled'), 'h1', 'Unstyled');
