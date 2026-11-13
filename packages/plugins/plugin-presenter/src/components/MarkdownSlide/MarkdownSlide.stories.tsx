//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import * as Splitter from '@dxos/react-ui/Splitter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type LayoutName } from '#markdown';

import { Slide } from '../Slide/index.ts';
import { SlideThemeProvider } from '../SlideTheme/index.ts';
import { MarkdownSlide, type MarkdownSlideProps } from './MarkdownSlide.tsx';

// A one-second 32×18 WebM, inlined so the story needs no network.
const VIDEO =
  'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAJVEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEyTbuMU6uEHFO7a1OsggI/7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjMuMS4xMDJXQYxMYXZmNjMuMS4xMDJEiYhAj0AAAAAAABZUrmvXrgEAAAAAAABO14EBc8WIgtz4bGKvzVCcgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QO5rKA4JCwgSC6gRKagQJVsIRVuYEBVe6BAOwBAAAAAAAAAgAAElTDZ/pzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYzLjEuMTAyc3PVY8CLY8WIgtz4bGKvzVBnyKBFo4dFTkNPREVSRIeTTGF2YzYzLjEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnVAiOeBAKO+gQAAgNACAJ0BKiAAEgAARwiFhYiFhIgCAgJ1qgP4AgghCD0A/vp5X/+p0/qdP6nT/6nT/9yAeyAeyAfv3ACjlYEA+gCxAQABEBAAGAAYWC/0AAhwAKOVgQH0ALEBAAEQEAAYABhYL/QACHAAo5WBAu4AsQEAARAQABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGx8IED';

const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#2a6"/><stop offset="1" stop-color="#26a"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
)}`;

const DefaultStory = (props: MarkdownSlideProps) => (
  <Slide.Frame inset>
    <MarkdownSlide {...props} />
  </Slide.Frame>
);

/**
 * The slide over the markdown that produced it, so a story shows the syntax beside its result. The seam starts at
 * half the height: the splitter sizes its panes in rem, and left to itself the machine gives the slide's canvas the
 * height its content asks for.
 */
const SourceStory = ({ content, ...props }: MarkdownSlideProps) => {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>();
  useLayoutEffect(() => {
    if (root && size === undefined) {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setSize(root.getBoundingClientRect().height / 2 / rem);
    }
  }, [root, size]);

  return (
    <Splitter.Root
      ref={setRoot}
      orientation='vertical'
      resizable
      size={size}
      onSizeChange={setSize}
      classNames='size-full'
    >
      <Splitter.Panel position='start'>
        <Slide.Frame inset classNames='min-h-0'>
          <MarkdownSlide content={content} {...props} />
        </Slide.Frame>
      </Splitter.Panel>
      <Splitter.ResizeTrigger aria-label='Resize' />
      <Splitter.Panel position='end'>
        <pre className='size-full p-4 overflow-auto bg-modal-surface text-description text-sm whitespace-pre-wrap'>
          {content}
        </pre>
      </Splitter.Panel>
    </Splitter.Root>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/MarkdownSlide',
  component: MarkdownSlide,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarkdownSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

const slide = (frontmatter: Record<string, string | number>, ...body: string[]) =>
  [
    '---',
    ...Object.entries(frontmatter).map(
      ([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`,
    ),
    '---',
    '',
    ...body,
  ].join('\n');

const query = (canvasElement: HTMLElement, selector: string, timeout = 1_000) =>
  waitFor(
    () => {
      const element = canvasElement.querySelector(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    },
    { timeout },
  );

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

/** Text over a photo gets a scrim; a content-free image slide does not. */
export const ImageScrim: Story = {
  args: { content: slide({ layout: 'image', image: IMAGE }, '# Over image') },
  play: async ({ canvasElement }) => {
    await query(canvasElement, '[data-layout="image"] [data-scrim]');
  },
};

export const ImageNoScrim: Story = {
  args: { content: slide({ layout: 'image', image: IMAGE }) },
  play: async ({ canvasElement }) => {
    await query(canvasElement, '[data-layout="image"]');
    await expect(canvasElement.querySelector('[data-scrim]')).toBeNull();
  },
};

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

export const VideoBackground: Story = {
  args: {
    content: slide({ backgroundVideo: VIDEO, backgroundOpacity: 0.6 }, '# Video background'),
  },
  play: async ({ canvasElement }) => {
    const video = await query(canvasElement, '[data-slide-background] video');
    await expect(video).toBeInstanceOf(HTMLVideoElement);
    if (video instanceof HTMLVideoElement) {
      await expect(video.autoplay && video.muted && video.loop && video.playsInline).toBe(true);
    }
  },
};

export const Code: Story = {
  args: {
    content: [
      '# Code',
      '',
      '```ts {2}',
      'const values = [1, 2, 3];',
      'const sum = values.reduce((total, value) => total + value, 0);',
      'console.log(sum);',
      '```',
    ].join('\n'),
  },
  play: async ({ canvasElement }) => {
    // Prism loads the grammar asynchronously; inline styles drop its class names, but `token` stays.
    await query(canvasElement, 'pre span.token', 5_000);
    const highlighted = canvasElement.querySelectorAll('pre .bg-hover-surface');
    await expect(highlighted).toHaveLength(1);
    await expect(highlighted[0].textContent).toContain('reduce');
  },
};

/** `{lines:true}` numbers the lines, alongside a highlighted line. */
export const CodeLineNumbers: Story = {
  args: {
    content: [
      '# Code with line numbers',
      '',
      '```ts {2}{lines:true}',
      'const values = [1, 2, 3];',
      'const sum = values.reduce((total, value) => total + value, 0);',
      'console.log(sum);',
      '```',
    ].join('\n'),
  },
  play: async ({ canvasElement }) => {
    await query(canvasElement, 'pre span.token', 5_000);
    const numbers = [...canvasElement.querySelectorAll('pre .linenumber')].map((element) => element.textContent);
    await expect(numbers).toEqual(['1', '2', '3']);
    await expect(canvasElement.querySelectorAll('pre .bg-hover-surface')).toHaveLength(1);
  },
};

export const Clicks: Story = {
  args: {
    step: 1,
    content: ['# Clicks', '', '<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n'),
  },
  play: async ({ canvasElement }) => {
    await query(canvasElement, 'li[data-step="1"]');
    await expect(canvasElement.querySelectorAll('li.invisible')).toHaveLength(2);
  },
};

/** `<List variant>` styles a markdown list without changing what it is: numbered cards beside outlined claims. */
export const ListVariants: Story = {
  render: SourceStory,
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
  render: SourceStory,
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
      '1. ECHO',
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
    await query(canvasElement, '[data-variant="steps"]');
    await query(canvasElement, '[data-variant="outline"]');
  },
};

/** `<Table variant>` styles a GFM table the same way `<List>` styles a list. */
export const TableVariants: Story = {
  render: SourceStory,
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
  render: SourceStory,
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
      <SourceStory {...props} />
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
      '</Box>',
    ),
  },
  play: async ({ canvasElement }) => {
    const steps = await query(canvasElement, 'ol[data-variant="steps"]');
    await expect(getComputedStyle(steps).getPropertyValue('--slide-accent').trim()).toBe('#ff7a1a');
    const box = await query(canvasElement, 'div[data-tone="info"]');
    await expect(getComputedStyle(box).getPropertyValue('--slide-accent').trim()).not.toBe('#ff7a1a');
  },
};
