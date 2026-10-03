//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { sizeRow } from '../../testing.ts';
import { type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Progress from './Progress.tsx';

type StoryArgs = SizeArgs & Pick<Progress.ProgressProps, 'value' | 'indeterminate' | 'error' | 'countdown' | 'paused'>;

const DefaultStory = ({ value, indeterminate, error, countdown, paused }: StoryArgs) => (
  <div className='flex flex-col gap-4'>
    <Progress.Progress
      {...{ value, indeterminate, error, countdown, paused }}
      label='Upload'
      data-testid='controlled'
    />
    <Progress.Progress value={0.25} label='Quarter' data-testid='quarter' />
    <Progress.Progress indeterminate label='Indexing' data-testid='indeterminate' />
    <Progress.Progress indeterminate error label='Failed' data-testid='failed' />
    <Progress.Progress countdown={60_000} data-testid='countdown' />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/Progress',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { value: 0.6, indeterminate: false, error: false, countdown: 0, paused: false },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    countdown: { control: 'number' },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A determinate bar reports its value and fills that share of the track; the other modes animate or fill. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const row = sizeRow(canvasElement, 'md');
    const canvas = within(row);

    const quarter = canvas.getByRole('progressbar', { name: 'Quarter' });
    await expect(quarter).toHaveAttribute('aria-valuenow', '0.25');
    await expect(quarter).toHaveAttribute('aria-valuemax', '1');
    const range = quarter.querySelector<HTMLElement>('[data-part="range"]');
    const track = quarter.getBoundingClientRect();
    await waitFor(() => expect(range?.getBoundingClientRect().width).toBeCloseTo(track.width / 4, 0));
    await expect(track.height).toBe(4);

    // Indeterminate: no value, and the range sweeps.
    const indeterminate = canvas.getByRole('progressbar', { name: 'Indexing' });
    await expect(indeterminate).not.toHaveAttribute('aria-valuenow');
    const sweep = indeterminate.querySelector<HTMLElement>('[data-part="range"]');
    await expect(sweep ? getComputedStyle(sweep).animationName : '').toBe('dx-progress-sweep');

    // A failed indeterminate run fills the track in the error colour and stops.
    const failed = canvas.getByRole('progressbar', { name: 'Failed' });
    const failedRange = failed.querySelector<HTMLElement>('[data-part="range"]');
    await expect(failedRange?.getBoundingClientRect().width).toBeCloseTo(failed.getBoundingClientRect().width, 0);
    await expect(failedRange ? getComputedStyle(failedRange).animationName : '').toBe('none');

    // A countdown is decoration: hidden from assistive tech, emptying over its duration.
    const countdown = canvas.getByTestId('countdown');
    await expect(countdown).toHaveAttribute('aria-hidden', 'true');
    await expect(within(countdown).queryByRole('progressbar')).toBeNull();
    const drain = countdown.querySelector<HTMLElement>('[data-part="range"]');
    await expect(drain ? getComputedStyle(drain).animationDuration : '').toBe('60s');
  },
};
