//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { type MessageValence } from '@dxos/ui-types';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const VALENCES: MessageValence[] = ['neutral', 'info', 'success', 'warning', 'error'];

/** One banner per valence; the error banner closes and holds a valence Button. */
const DefaultStory = ({ size }: SizeArgs) => {
  const [open, setOpen] = useState(true);
  return (
    <Next.Container gap='md'>
      {VALENCES.filter((valence) => valence !== 'error' || open).map((valence) => (
        <Next.Banner.Root key={valence} valence={valence} data-testid={`${valence}-${size}`}>
          <Next.Banner.Title onClose={valence === 'error' ? () => setOpen(false) : undefined}>
            {valence[0].toUpperCase() + valence.slice(1)}
          </Next.Banner.Title>
          <Next.Banner.Body>The body text lines up with the title, not the icon.</Next.Banner.Body>
          {valence === 'error' && (
            <Next.Group>
              <Next.Button variant='valence' data-testid={`retry-${size}`}>
                Retry
              </Next.Button>
            </Next.Group>
          )}
        </Next.Banner.Root>
      ))}
    </Next.Container>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Banner',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A neutral banner is a note (a paragraph cannot be named) and any other valence an alert, named by its title and
 * described by its body; the icon sits in the start rail so the body aligns with the title text, each valence paints
 * its own surface, a `valence` Button takes the banner's colour, and the close button removes it.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    await expectScoped(canvasElement);
    const canvas = within(sizeRow(canvasElement, 'md'));
    await expect(canvas.getByRole('note', { name: 'Neutral' })).toBeInTheDocument();
    const error = canvas.getByRole('alert', { name: 'Error' });
    await expect(error).toHaveAccessibleDescription('The body text lines up with the title, not the icon.');

    const neutral = byTestId(canvasElement, 'neutral-md');
    const title = neutral.querySelector('h2')?.getBoundingClientRect();
    const body = neutral.querySelector('[data-part="body"]')?.getBoundingClientRect();
    const icon = neutral.querySelector('svg')?.getBoundingClientRect();
    await expect(body?.left).toBeCloseTo(title?.left ?? 0, 0);
    await expect(icon?.right).toBeLessThan(title?.left ?? 0);

    const surfaces = new Set(
      VALENCES.map((valence) => getComputedStyle(byTestId(canvasElement, `${valence}-md`)).backgroundColor),
    );
    await expect(surfaces.size).toBe(VALENCES.length);
    const retry = getComputedStyle(byTestId(canvasElement, 'retry-md')).backgroundColor;
    await expect(retry).not.toBe('rgba(0, 0, 0, 0)');
    await expect(retry).not.toBe(getComputedStyle(error).backgroundColor);

    await userEvent.click(within(error).getByRole('button', { name: 'Close' }));
    await expect(canvas.queryByRole('alert', { name: 'Error' })).toBeNull();
  },
};
