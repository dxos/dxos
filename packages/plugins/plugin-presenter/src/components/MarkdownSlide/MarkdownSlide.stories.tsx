//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { query, slide } from '../../testing/slideStory.tsx';
import { SlideFrame } from '../Slide/canvas.tsx';
import { MarkdownSlide, type MarkdownSlideProps } from './MarkdownSlide.tsx';

// A one-second 32×18 WebM, inlined so the story needs no network.
const VIDEO =
  'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAJVEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEyTbuMU6uEHFO7a1OsggI/7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjMuMS4xMDJXQYxMYXZmNjMuMS4xMDJEiYhAj0AAAAAAABZUrmvXrgEAAAAAAABO14EBc8WIgtz4bGKvzVCcgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QO5rKA4JCwgSC6gRKagQJVsIRVuYEBVe6BAOwBAAAAAAAAAgAAElTDZ/pzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYzLjEuMTAyc3PVY8CLY8WIgtz4bGKvzVBnyKBFo4dFTkNPREVSRIeTTGF2YzYzLjEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnVAiOeBAKO+gQAAgNACAJ0BKiAAEgAARwiFhYiFhIgCAgJ1qgP4AgghCD0A/vp5X/+p0/qdP6nT/6nT/9yAeyAeyAfv3ACjlYEA+gCxAQABEBAAGAAYWC/0AAhwAKOVgQH0ALEBAAEQEAAYABhYL/QACHAAo5WBAu4AsQEAARAQABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGx8IED';

const DefaultStory = (props: MarkdownSlideProps) => (
  <SlideFrame inset>
    <MarkdownSlide {...props} />
  </SlideFrame>
);

/**
 * What the renderer does with a slide's content, rather than what a slide can be made to look like: the background
 * video it mounts, code fence directives, and click steps. What each layout and each tag offers is shown under
 * `layouts/` and `tags/`.
 */
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
