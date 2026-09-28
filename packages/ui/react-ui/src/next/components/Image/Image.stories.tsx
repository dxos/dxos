//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

/** Inline SVG, so the stories never fetch from the network. */
const LANDSCAPE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
    <defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#38bdf8'/><stop offset='1' stop-color='#6366f1'/></linearGradient></defs>
    <rect width='320' height='180' fill='url(#g)'/><circle cx='250' cy='50' r='24' fill='#fde68a'/>
    <path d='M0 180 L90 90 L160 150 L220 110 L320 180 Z' fill='#1e293b' opacity='.6'/>
  </svg>`,
)}`;

/** A malformed data URI fails to decode without any network request. */
const BROKEN = 'data:image/png;base64,AAAA';

const DefaultStory = () => (
  <div className='grid grid-cols-2 gap-4 w-[36rem]'>
    <Next.Image src={LANDSCAPE} alt='Mountains at dusk' data-testid='cover' />
    <Next.Image src={LANDSCAPE} alt='Mountains, contained' aspectRatio='1' fit='contain' data-testid='contain' />
    <Next.Image src={BROKEN} alt='Missing photo' data-testid='broken' />
    <Next.Image src={LANDSCAPE} alt='Mountains, square' aspectRatio='1' data-testid='square' />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/image',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Frames keep their ratio, loaded images fill them, and a broken source shows the fallback icon. */
export const Load: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [testId, ratio] of [
      ['cover', 16 / 9],
      ['contain', 1],
      ['square', 1],
    ] as const) {
      const frame = canvas.getByTestId(testId);
      await waitFor(() => expect(frame).toHaveAttribute('data-status', 'loaded'));
      const box = frame.getBoundingClientRect();
      await expect(box.width / box.height, testId).toBeCloseTo(ratio, 1);
      const img = within(frame).getByRole('img').getBoundingClientRect();
      await expect(img.width).toBeCloseTo(box.width, 0);
      await expect(img.height).toBeCloseTo(box.height, 0);
    }
    await expect(canvas.getByRole('img', { name: 'Mountains at dusk' })).toHaveAttribute('loading', 'lazy');

    const broken = canvas.getByTestId('broken');
    await waitFor(() => expect(broken).toHaveAttribute('data-status', 'error'));
    const icon = within(broken).getByRole('img', { name: 'Missing photo' });
    await expect(icon.tagName.toLowerCase()).toBe('svg');
    // The icon is centred in the frame.
    const frame = broken.getBoundingClientRect();
    const glyph = icon.getBoundingClientRect();
    await expect(glyph.left + glyph.width / 2).toBeCloseTo(frame.left + frame.width / 2, 0);
    await expect(glyph.top + glyph.height / 2).toBeCloseTo(frame.top + frame.height / 2, 0);
  },
};
