//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

/** An inline 16:9 picture, so the story needs no network. */
const IMAGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='640' height='360' fill='#3b82f6'/><text x='320' y='190' font-size='48' text-anchor='middle' fill='white'>Media</text></svg>`,
)}`;

type StoryArgs = Pick<Next.MediaPlayerProps, 'fit' | 'controls' | 'muted' | 'loop'>;

const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (
  <div className='grid grid-cols-2 gap-4'>
    <div className='h-48 border border-separator'>
      <Next.MediaPlayer src={IMAGE} alt='Blue card' fit={fit} data-testid='image' />
    </div>
    <div className='h-48 border border-separator'>
      <Next.MediaPlayer src={IMAGE} alt='Contained card' fit='contain' data-testid='contained' />
    </div>
    <div className='h-48 border border-separator'>
      <Next.MediaPlayer
        src='data:video/mp4;base64,'
        kind='video'
        alt='Demo video'
        {...{ controls, muted, loop }}
        data-testid='video'
      />
    </div>
    <div className='h-48 border border-separator'>
      <Next.MediaPlayer src='data:image/png;base64,broken' alt='Broken' data-testid='broken' />
    </div>
    <div className='col-span-2'>
      <Next.MediaPlayer src='/podcast/episode.mp3?token=1' alt='Episode' data-testid='audio' />
    </div>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/MediaPlayer',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4 w-[40rem]' }), withTheme()],
  args: { fit: 'cover', controls: true, muted: false, loop: false },
  argTypes: { fit: { control: 'select', options: ['cover', 'contain', 'fill', 'none', 'scale-down'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The URL picks the element; the element is the part and fills its host; a broken image is removed. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const image = canvas.getByRole('img', { name: 'Blue card' });
    await expect(image.tagName).toBe('IMG');
    await expect(image).toHaveAttribute('data-scope', 'media-player');
    await expect(image).toHaveAttribute('data-kind', 'image');
    await waitFor(() => expect(image).toHaveAttribute('data-status', 'loaded'));
    const host = image.parentElement?.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    await expect(rect.height).toBeCloseTo((host?.height ?? 0) - 2, 0);
    await expect(getComputedStyle(image).objectFit).toBe('cover');
    await expect(getComputedStyle(canvas.getByTestId('contained')).objectFit).toBe('contain');

    // An explicit kind plays natively even without an extension.
    const video = canvas.getByTestId('video');
    await expect(video.tagName).toBe('VIDEO');
    await expect(video).toHaveAttribute('aria-label', 'Demo video');
    await expect(video).toHaveAttribute('controls');

    // A media extension (ignoring the query) picks audio.
    const audio = canvas.getByTestId('audio');
    await expect(audio.tagName).toBe('AUDIO');

    const broken = canvas.getByTestId('broken');
    await waitFor(() => expect(broken).toHaveAttribute('data-status', 'error'));
    await expect(broken).not.toBeVisible();
  },
};
