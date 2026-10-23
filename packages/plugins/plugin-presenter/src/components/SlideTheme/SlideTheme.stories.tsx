//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SlideTheme } from '#types';

import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import { SlideFrame } from '../SlideFrame/index.ts';
import { SlideThemeProvider } from './SlideTheme.tsx';

const CONTENT = [
  '# Local-first',
  '',
  '- Data lives on the device',
  '- Sync is peer to peer',
  '',
  '> The network is optional.',
  '',
  '```ts',
  "const space = await client.spaces.create({ name: 'Demo' });",
  '```',
].join('\n');

type StoryProps = { themes: SlideTheme.Settings[] };

const DefaultStory = ({ themes }: StoryProps) => (
  <div className='grid grid-cols-2 auto-rows-fr gap-2 p-2 size-full'>
    {themes.map((settings, index) => (
      <div key={index} data-theme-name={settings.name} className='flex flex-col min-h-0'>
        <SlideThemeProvider settings={settings}>
          <SlideFrame inset>
            <MarkdownSlide content={CONTENT} />
          </SlideFrame>
        </SlideThemeProvider>
      </div>
    ))}
  </div>
);

const meta = {
  title: 'plugins/plugin-presenter/components/SlideTheme',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every built-in theme rendering the same slide. */
export const Default: Story = {
  args: { themes: SlideTheme.NAMES.map((name) => ({ name })) },
  play: async ({ canvasElement }) => {
    const slide = (name: string) => {
      const element = canvasElement.querySelector(`[data-theme-name="${name}"] [data-slide]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing ${name} slide`);
      }
      return element;
    };
    const [light, dark] = await waitFor(() => [slide('light'), slide('dark')]);
    await expect(dark.style.colorScheme).toBe('dark');
    await expect(light.style.colorScheme).toBe('light');
    await expect(getComputedStyle(light).backgroundColor).not.toBe(getComputedStyle(dark).backgroundColor);
  },
};

/** A theme with accent, background, text color and font overrides; the unsafe value is ignored. */
export const Overrides: Story = {
  args: {
    themes: [
      { name: 'dark', accent: '#f97316' },
      { name: 'light', background: '#fef3c7', foreground: '#451a03', accent: '#b45309' },
      { name: 'serif', accent: 'oklch(65% 0.2 300)' },
      { name: 'default', accent: 'url(https://example.com/x)', font: 'sans' },
    ],
  },
};

/** Each text font with a code font; web fonts load on first use. */
export const Fonts: Story = {
  args: {
    themes: [
      { name: 'default', font: 'sans', monoFont: 'fira' },
      { name: 'default', font: 'rounded', monoFont: 'plex' },
      { name: 'light', font: 'serif', monoFont: 'jetbrains' },
      { name: 'dark', font: 'display', monoFont: 'system' },
    ],
  },
};
