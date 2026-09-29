//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { sizeRow } from '../../testing.ts';

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

/** Cover, contain, broken and square frames, and a clickable image. */
const DefaultStory = ({ size }: SizeArgs) => {
  const [clicks, setClicks] = useState(0);
  return (
    <div className='grid grid-cols-4 gap-2'>
      <Next.Image src={LANDSCAPE} alt={`Mountains at dusk ${size}`} data-testid={`cover-${size}`} />
      <Next.Image
        src={LANDSCAPE}
        alt={`Mountains, contained ${size}`}
        aspectRatio='1'
        fit='contain'
        data-testid={`contain-${size}`}
      />
      <Next.Image src={BROKEN} alt={`Missing photo ${size}`} data-testid={`broken-${size}`} />
      <Next.Image src={LANDSCAPE} alt={`Mountains, square ${size}`} aspectRatio='1' data-testid={`square-${size}`} />
      <Next.Image
        src={LANDSCAPE}
        alt={`Open mountains ${size}`}
        onClick={() => setClicks((count) => count + 1)}
        data-testid={`clickable-${size}`}
      />
      <Next.Typography data-testid={`clicks-${size}`}>Opened {clicks}</Next.Typography>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/image',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[40rem]' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Frames keep their ratio, loaded images fill them, and a broken source shows the fallback icon. With `onClick` the
 * frame is a button named by its `alt`, activated by click, Enter and Space, with a focus ring.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    for (const [testId, ratio] of [
      ['cover-md', 16 / 9],
      ['contain-md', 1],
      ['square-md', 1],
    ] as const) {
      const frame = canvas.getByTestId(testId);
      await waitFor(() => expect(frame).toHaveAttribute('data-status', 'loaded'));
      const box = frame.getBoundingClientRect();
      await expect(box.width / box.height, testId).toBeCloseTo(ratio, 1);
      const img = within(frame).getByRole('img').getBoundingClientRect();
      await expect(img.width).toBeCloseTo(box.width, 0);
      await expect(img.height).toBeCloseTo(box.height, 0);
    }
    await expect(canvas.getByRole('img', { name: 'Mountains at dusk md' })).toHaveAttribute('loading', 'lazy');

    const broken = canvas.getByTestId('broken-md');
    await waitFor(() => expect(broken).toHaveAttribute('data-status', 'error'));
    const icon = within(broken).getByRole('img', { name: 'Missing photo md' });
    await expect(icon.tagName.toLowerCase()).toBe('svg');
    // The icon is centred in the frame.
    const frame = broken.getBoundingClientRect();
    const glyph = icon.getBoundingClientRect();
    await expect(glyph.left + glyph.width / 2).toBeCloseTo(frame.left + frame.width / 2, 0);
    await expect(glyph.top + glyph.height / 2).toBeCloseTo(frame.top + frame.height / 2, 0);

    const clickable = canvas.getByRole('button', { name: 'Open mountains md' });
    await expect(clickable).toBe(canvas.getByTestId('clickable-md'));
    await userEvent.click(clickable);
    await waitFor(() => expect(canvas.getByTestId('clicks-md')).toHaveTextContent('Opened 1'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getByTestId('clicks-md')).toHaveTextContent('Opened 2'));
    await userEvent.keyboard(' ');
    await waitFor(() => expect(canvas.getByTestId('clicks-md')).toHaveTextContent('Opened 3'));
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect(clickable).toHaveFocus();
    await expect(getComputedStyle(clickable).outlineStyle).toBe('solid');
    await expect(canvas.getByTestId('cover-md')).not.toHaveAttribute('role');
  },
};
