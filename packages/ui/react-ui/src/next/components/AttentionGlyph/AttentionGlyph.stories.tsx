//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & Pick<Next.AttentionGlyphProps, 'attended' | 'containsAttended' | 'syncing'>;

const PRESENCES: Next.AttentionGlyphPresence[] = ['none', 'one', 'many'];

const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (
  <div className='flex items-center gap-4'>
    {PRESENCES.map((presence) => (
      <Next.AttentionGlyph
        key={presence}
        presence={presence}
        {...{ attended, containsAttended, syncing }}
        data-testid={presence}
      />
    ))}
    <Next.AttentionGlyph attended presence='one' data-testid='attended' />
    <Next.AttentionGlyph containsAttended data-testid='contains' />
    <Next.AttentionGlyph syncing data-testid='syncing' />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/AttentionGlyph',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[24rem]' }), withTheme()],
  args: { size: 'md', attended: false, containsAttended: false, syncing: false },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The glyph is 3/4 of the icon size; its state colours it, and its mark shows presence or a spinner. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const rest = canvas.getByTestId('none');
    await expect(rest.getBoundingClientRect().width).toBe(12);
    await expect(rest.getBoundingClientRect().height).toBe(12);
    await expect(within(sizeRow(canvasElement, 'xl')).getByTestId('none').getBoundingClientRect().width).toBe(18);
    await expect(rest.childElementCount).toBe(0);

    // Presence marks are decorative; one and many draw different marks.
    const one = canvas.getByTestId('one').querySelector('svg');
    const many = canvas.getByTestId('many').querySelector('svg');
    await expect(one).toHaveAttribute('aria-hidden', 'true');
    await expect(one?.innerHTML).not.toBe(many?.innerHTML);

    // Attended fills with the accent; containing the attended item tints; at rest it is transparent.
    const background = (testId: string) => getComputedStyle(canvas.getByTestId(testId)).backgroundColor;
    await expect(background('none')).toBe('rgba(0, 0, 0, 0)');
    await expect(background('attended')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe(background('attended'));

    // Syncing replaces the mark with a spinner turning every two seconds.
    const spinner = canvas.getByTestId('syncing').querySelector<SVGElement>('[data-scope="icon"]');
    await expect(spinner ? getComputedStyle(spinner).animationDuration : '').toBe('2s');
  },
};
