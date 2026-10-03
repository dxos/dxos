//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { expectTooltip, realHover } from '../../testing.ts';
import * as Typography from '../Typography/Typography.tsx';
import * as Timestamp from './Timestamp.tsx';

const NOW = new Date('2026-06-15T12:00:00Z');

const minutesBefore = (minutes: number, now = NOW): Date => new Date(now.getTime() - minutes * 60_000);

/** One row per age, so the ladder (counter, then hours, then a date) reads at once. */
const LADDER: Array<{ label: string; minutes: number }> = [
  { label: 'just now', minutes: 0 },
  { label: 'a minute', minutes: 1 },
  { label: 'under an hour', minutes: 42 },
  { label: 'past the hour, still minutes', minutes: 90 },
  { label: 'hours', minutes: 5 * 60 },
  { label: 'most of a day', minutes: 23 * 60 },
  { label: 'yesterday', minutes: 26 * 60 },
  { label: 'last month', minutes: 40 * 24 * 60 },
];

type StoryArgs = { live?: boolean };

const DefaultStory = ({ live }: StoryArgs) => {
  // Held in state so the instants keep their identity across renders.
  const [now] = useState(() => (live ? new Date() : NOW));
  return (
    <div className='grid grid-cols-[1fr_min-content] gap-x-4 gap-y-1'>
      {LADDER.map(({ label, minutes }) => (
        <Fragment key={label}>
          <Typography.Typography>{label}</Typography.Typography>
          <Timestamp.Timestamp
            date={minutesBefore(minutes, now)}
            now={live ? undefined : NOW}
            data-testid={`minutes-${minutes}`}
          />
        </Fragment>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Timestamp',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4 w-[24rem]' }), withTheme()],
  args: { live: true },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The ladder against a fixed clock, a machine-readable `<time>`, and the full instant in a Tooltip on hover. */
export const Test: Story = {
  args: { live: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const texts = LADDER.slice(0, 6).map(({ minutes }) => canvas.getByTestId(`minutes-${minutes}`).textContent);
    await expect(texts).toEqual(['now', '1m', '42m', '90m', '5h', '23h']);
    // Beyond a day the count stops and the calendar locates it instead.
    await expect(canvas.getByTestId(`minutes-${26 * 60}`).textContent).not.toMatch(/h$/);

    const time = canvas.getByTestId('minutes-90');
    await expect(time.tagName).toBe('TIME');
    await expect(time).toHaveAttribute('dateTime', minutesBefore(90).toISOString());
    await expect(time).toHaveAttribute('data-scope', 'timestamp');
    await expect(getComputedStyle(time).fontVariantNumeric).toBe('tabular-nums');

    // The year is the part of the full instant no compact form shows.
    await realHover(time);
    await expectTooltip(time, '2026');
  },
};

/** The component's own timer turns `now` into `1m`: the instant is fixed, so nothing else re-renders it. */
export const TestTicks: Story = {
  render: () => {
    const [date] = useState(() => new Date(Date.now() - 58_000));
    return <Timestamp.Timestamp date={date} data-testid='ticking' />;
  },
  play: async ({ canvasElement }) => {
    const time = within(canvasElement).getByTestId('ticking');
    await expect(time).toHaveTextContent('now');
    await waitFor(() => expect(time).toHaveTextContent('1m'), { timeout: 5_000 });
  },
};
