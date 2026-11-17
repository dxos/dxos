//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SlideFrame } from '../components/canvas.tsx';
import { MarkdownSlide, type MarkdownSlideProps } from '../components/MarkdownSlide/index.ts';
import { type LayoutName, LAYOUTS } from '../markdown/index.ts';
import { query, slide } from '../testing/slideStory.tsx';

const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#2a6"/><stop offset="1" stop-color="#26a"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
)}`;

// A tall picture, so `cover` and `contain` do visibly different things inside a 16:9 slide.
const TALL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 16"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6"/><stop offset="1" stop-color="#26a"/></linearGradient></defs><rect width="9" height="16" fill="url(#g)"/></svg>',
)}`;

const DefaultStory = (props: MarkdownSlideProps) => (
  <SlideFrame inset>
    <MarkdownSlide {...props} />
  </SlideFrame>
);

/**
 * Every layout `layout:` names, one story each, in the order `LAYOUTS` declares them — the set a deck author chooses
 * from, plus what a layout's own options do to it. Each slide holds the least content that makes the layout's regions
 * visible, so the stories read as a catalogue; the renderer's own behaviour is tested under `components/`.
 */
const meta = {
  title: 'ui/react-ui-slides/layouts/Layouts',
  component: MarkdownSlide,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarkdownSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

const lead = ['# Slide title', '', 'Supporting text for the slide.'];

/**
 * What each layout is shown with: the markdown, and the element that proves the layout placed it. One table, so the
 * story per layout and the grid of all of them cannot drift apart.
 */
const CATALOGUE: Record<LayoutName, { content: string; selector: string; text: string }> = {
  'default': {
    content: slide({ layout: 'default' }, ...lead),
    selector: '[data-slot="default"] h1',
    text: 'Slide title',
  },
  'cover': {
    content: slide(
      { layout: 'cover', background: IMAGE, backgroundOpacity: 0.5 },
      '# Presenter',
      '',
      'Composer slides',
    ),
    selector: 'h1',
    text: 'Presenter',
  },
  'center': { content: slide({ layout: 'center' }, '# Centered'), selector: 'h1', text: 'Centered' },
  'section': { content: slide({ layout: 'section' }, '# Part two'), selector: 'h1', text: 'Part two' },
  'intro': {
    content: slide({ layout: 'intro' }, '# Introduction', '', 'Speaker name, role'),
    selector: 'p',
    text: 'Speaker name',
  },
  'end': { content: slide({ layout: 'end' }, '# Thank you'), selector: 'h1', text: 'Thank you' },
  'fact': {
    content: slide({ layout: 'fact' }, '# 100%', '', 'Of slides are markdown'),
    selector: 'h1',
    text: '100%',
  },
  'statement': {
    content: slide({ layout: 'statement' }, '# Local-first by default'),
    selector: 'h1',
    text: 'Local-first',
  },
  'quote': {
    content: slide({ layout: 'quote' }, '> Simplicity is prerequisite for reliability.', '', 'Edsger Dijkstra'),
    selector: 'blockquote',
    text: 'Simplicity',
  },
  'two-cols': {
    content: slide(
      { layout: 'two-cols' },
      '# Left',
      '',
      '- one',
      '- two',
      '',
      '::right::',
      '',
      '# Right',
      '',
      'Right column',
    ),
    selector: '[data-slot="right"]',
    text: 'Right column',
  },
  'two-cols-header': {
    content: slide(
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
    selector: '[data-slot="left"]',
    text: 'Left column',
  },
  'three-cols': {
    content: slide(
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
    selector: '[data-slot="right"]',
    text: 'Third column',
  },
  'two-by-two': {
    content: slide(
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
    selector: '[data-slot="bottom-right"]',
    text: 'Fourth region',
  },
  'image': {
    content: slide({ layout: 'image', image: IMAGE }, '# Over image'),
    selector: 'h1',
    text: 'Over image',
  },
  'image-left': {
    content: slide({ layout: 'image-left', image: IMAGE }, '# Image left', '', 'Content on the right.'),
    selector: '[data-image] + [data-slot="default"]',
    text: 'Content on the right',
  },
  'image-right': {
    content: slide({ layout: 'image-right', image: IMAGE }, '# Image right', '', 'Content on the left.'),
    selector: '[data-slot="default"]:has(+ [data-image])',
    text: 'Content on the left',
  },
  'full': {
    content: slide({ layout: 'full' }, '# Full bleed'),
    selector: '[data-slot="default"]',
    text: 'Full bleed',
  },
  'none': { content: slide({ layout: 'none' }, '# Unstyled'), selector: 'h1', text: 'Unstyled' },
};

/** A story drawing one layout, asserting the element the catalogue says proves it. */
const layoutStory = (layout: LayoutName): Story => {
  const { content, selector, text } = CATALOGUE[layout];
  return {
    args: { content },
    play: async ({ canvasElement }) => {
      const element = await query(canvasElement, `[data-layout="${layout}"] ${selector}`);
      await expect(element.textContent).toContain(text);
    },
  };
};

export const Default = layoutStory('default');

export const Cover = layoutStory('cover');

export const Center = layoutStory('center');

export const Section = layoutStory('section');

export const Intro = layoutStory('intro');

export const End = layoutStory('end');

export const Fact = layoutStory('fact');

export const Statement = layoutStory('statement');

export const Quote = layoutStory('quote');

export const TwoCols = layoutStory('two-cols');

export const TwoColsHeader = layoutStory('two-cols-header');

export const ThreeCols = layoutStory('three-cols');

export const TwoByTwo = layoutStory('two-by-two');

export const Image = layoutStory('image');

export const ImageLeft = layoutStory('image-left');

export const ImageRight = layoutStory('image-right');

export const Full = layoutStory('full');

export const None = layoutStory('none');

/** Text over a picture gets a scrim, so it stays readable; a picture with nothing on it does not. */
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

/** The default: a picture fills the slide, and whatever does not fit its 16:9 is cropped away. */
export const BackgroundCover: Story = {
  args: { content: slide({ layout: 'cover', background: TALL }, '# Cover') },
  play: async ({ canvasElement }) => {
    const background = await query(canvasElement, '[data-slide-background] > div');
    await expect(getComputedStyle(background).backgroundSize).toBe('cover');
  },
};

/**
 * `backgroundFit: contain` draws the whole picture instead, and `backgroundColor` is the ground it leaves the rest of
 * the slide to — without one, the slide's own surface shows beside a picture that does not share its shape.
 */
export const BackgroundContain: Story = {
  args: {
    content: slide(
      { layout: 'cover', background: TALL, backgroundFit: 'contain', backgroundColor: '#0b1f17' },
      '# Contain',
    ),
  },
  play: async ({ canvasElement }) => {
    const background = await query(canvasElement, '[data-slide-background] > div');
    const style = getComputedStyle(background);
    await expect(style.backgroundSize).toBe('contain');
    await expect(style.backgroundColor).toBe('rgb(11, 31, 23)');
  },
};

/** `backgroundColor` with no picture is simply the slide's own background, for this slide only. */
export const BackgroundColor: Story = {
  args: { content: slide({ layout: 'center', backgroundColor: '#2d0b1f' }, '# One slide, one color') },
  play: async ({ canvasElement }) => {
    const background = await query(canvasElement, '[data-slide-background] > div');
    await expect(getComputedStyle(background).backgroundColor).toBe('rgb(45, 11, 31)');
  },
};

/**
 * `scrim:` paints what is outside the slide: the inset void here, and the letterbox bands when presenting. It is the
 * canvas that paints it, not the slide, so a slide names the color and the canvas around it takes it.
 */
export const Scrim: Story = {
  args: { content: slide({ layout: 'center', scrim: '#3b0a1f' }, '# Framed') },
  play: async ({ canvasElement }) => {
    const surround = await query(canvasElement, '[data-scrim-surface]');
    // The slide publishes its scrim to the canvas around it, so the surround takes the color a commit later.
    await waitFor(() => expect(getComputedStyle(surround).backgroundColor).toBe('rgb(59, 10, 31)'));
    // The slide itself keeps the deck's background; only what is around it changed.
    const slideElement = await query(canvasElement, '[data-slide]');
    await expect(getComputedStyle(slideElement).backgroundColor).not.toBe('rgb(59, 10, 31)');
  },
};

/**
 * Without one, the scrim is the theme's own — black, as a projected slide is letterboxed in a dark room rather than
 * on the deck's ground. It is the same color inset and letterboxed, so the editor and the projector agree.
 */
export const ScrimDefault: Story = {
  args: { content: slide({ layout: 'center' }, '# Unframed') },
  play: async ({ canvasElement }) => {
    const surround = await query(canvasElement, '[data-scrim-surface]');
    await expect(getComputedStyle(surround).backgroundColor).toBe('rgb(0, 0, 0)');
    // The slide keeps the deck's background; only what is around it is the scrim.
    const slideElement = await query(canvasElement, '[data-slide]');
    await expect(getComputedStyle(slideElement).backgroundColor).not.toBe('rgb(0, 0, 0)');
  },
};

/** Every layout at once, each at thumbnail size under its name — the whole set to choose from on one screen. */
export const All: Story = {
  // The story draws the whole catalogue rather than one slide, so the component's own `content` goes unused.
  args: { content: '' },
  render: () => (
    <div className='dx-fill overflow-auto p-4 grid grid-cols-3 gap-4 auto-rows-min'>
      {LAYOUTS.map((layout) => (
        <figure key={layout} className='grid gap-1 min-w-0'>
          {/* The canvas scales to its container and draws nothing until it has measured one, so the tile carries
              the slide's own 16:9 rather than leaving its height to the grid row. */}
          <div className='flex aspect-video'>
            <SlideFrame inset>
              <MarkdownSlide content={CATALOGUE[layout].content} />
            </SlideFrame>
          </div>
          <figcaption className='text-center text-sm text-fg-subtle font-mono'>{layout}</figcaption>
        </figure>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await query(canvasElement, '[data-layout="none"]');
    const drawn = [...canvasElement.querySelectorAll('[data-layout]')].map((element) =>
      element.getAttribute('data-layout'),
    );
    // Every layout is drawn, once, in the order `LAYOUTS` declares them.
    await expect(drawn).toEqual([...LAYOUTS]);
  },
};
